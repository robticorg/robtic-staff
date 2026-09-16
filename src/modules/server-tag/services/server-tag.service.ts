import type { Guild, GuildMember } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import type { StaffTagRestrictionDocument } from "../models/staff-tag-restriction.model.ts";
import {
  StaffTagRestorationReason,
  StaffTagRestrictionStatus,
  TagTransition,
} from "../types/enums.ts";
import { roleSnapshotService } from "./role-snapshot.service.ts";
import { staffTagRestrictionService } from "./staff-tag-restriction.service.ts";
import { serverTagLogService } from "./server-tag-log.service.ts";

const log = logger.child("server-tag");
const M = serverTagMessages;
const BOT_ACTOR = "BOT";

/** The shape we need off a discord.js `User` — keeps the logic unit-testable. */
export interface PrimaryGuildLike {
  identityEnabled?: boolean | null;
  identityGuildId?: string | null;
  tag?: string | null;
}

export interface TagUserLike {
  primaryGuild?: PrimaryGuildLike | null;
}

/**
 * §Intro — the single source of truth. `primaryGuild.tag` is deliberately
 * unused: Server Tags are not globally unique, so only the guild id proves the
 * identity belongs to *this* server.
 */
export function isUsingGuildTag(user: TagUserLike | null | undefined, guildId: GuildId): boolean {
  const pg = user?.primaryGuild;
  if (!pg) return false;
  return pg.identityEnabled === true && pg.identityGuildId === guildId;
}

/** Guild ids implicated by a tag change — old identity, new identity, or both. */
export function affectedGuildIds(
  oldUser: TagUserLike | null | undefined,
  newUser: TagUserLike | null | undefined,
): Set<GuildId> {
  const ids = new Set<GuildId>();
  const before = oldUser?.primaryGuild?.identityGuildId;
  const after = newUser?.primaryGuild?.identityGuildId;
  if (before) ids.add(before);
  if (after) ids.add(after);
  return ids;
}

export type ServerTagOutcome =
  | "granted"
  | "removed"
  | "restricted"
  | "restored"
  | "noop"
  | "member-gone"
  | "already"
  | "blocked";

export class ServerTagService {
  /**
   * §4 — compare the two states and act only on a real edge.
   *
   * When the previous state is unknown (`oldUser` was a partial, or the cached
   * user never carried `primary_guild`) we only ever report ENABLED. Acting on
   * an unverified DISABLED would strip a staff member's roles on a spurious
   * profile update, so the destructive edge requires proof.
   */
  detectTagState(
    oldUser: TagUserLike | null | undefined,
    newUser: TagUserLike | null | undefined,
    guildId: GuildId,
  ): TagTransition {
    const after = isUsingGuildTag(newUser, guildId);
    const oldKnown = oldUser != null && oldUser.primaryGuild !== undefined;

    if (!oldKnown) return after ? TagTransition.ENABLED : TagTransition.UNCHANGED;

    const before = isUsingGuildTag(oldUser, guildId);
    if (before === after) return TagTransition.UNCHANGED;
    return after ? TagTransition.ENABLED : TagTransition.DISABLED;
  }

  /** §5 / §19 — grant the Tag Role, and lift an ACTIVE restriction if present. */
  async handleTagAdded(guild: Guild, userId: UserId): Promise<ServerTagOutcome> {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      log.debug(`tag enabled by ${userId} but they are not in guild ${guild.id}`);
      return "member-gone";
    }

    const tagRoleId = await this.grantTagRole(member);

    const restriction = await staffTagRestrictionService.getActiveRestriction(guild.id, userId);
    if (!restriction) {
      await serverTagLogService.post(guild.id, {
        kind: "TAG_ENABLED",
        userId,
        tagRoleId,
      });
      return "granted";
    }

    const outcome = await this.restoreRestriction(
      member,
      restriction,
      StaffTagRestrictionStatus.RESTORED,
      StaffTagRestorationReason.TAG_REAPPLIED,
    );
    return outcome === "restored" ? "restored" : outcome;
  }

  /** §6 / §18 — always drop the Tag Role; apply the Staff restriction only to staff. */
  async handleTagRemoved(guild: Guild, userId: UserId): Promise<ServerTagOutcome> {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      log.debug(`tag removed by ${userId} but they are not in guild ${guild.id}`);
      return "member-gone";
    }

    const tagRoleId = await this.removeTagRole(member);

    if (!(await staffPermissionService.isStaff(member))) {
      await serverTagLogService.post(guild.id, {
        kind: "TAG_DISABLED",
        userId,
        tagRoleId,
      });
      return "removed";
    }

    return this.applyStaffRestriction(member, tagRoleId);
  }

  /** Returns the tag role id when it was actually granted, else null. */
  async grantTagRole(member: GuildMember): Promise<string | null> {
    const tagRoleId = await roleSnapshotService.getTagRoleId(member.guild.id);
    if (!tagRoleId) return null;
    if (!member.guild.roles.cache.has(tagRoleId)) {
      log.warn(`configured tag role ${tagRoleId} no longer exists in ${member.guild.id}`);
      await serverTagLogService.post(member.guild.id, {
        kind: "PROBLEM",
        userId: member.id,
        detail: M.log.problems.tagRoleMissing,
      });
      return null;
    }
    const added = await roleSnapshotService.addTagRole(
      member,
      tagRoleId,
      "Server Tag enabled for this guild",
    );
    return added ? tagRoleId : null;
  }

  /** Returns the tag role id when it was actually removed, else null. */
  async removeTagRole(member: GuildMember): Promise<string | null> {
    const tagRoleId = await roleSnapshotService.getTagRoleId(member.guild.id);
    if (!tagRoleId) return null;
    const removed = await roleSnapshotService.removeTagRole(
      member,
      tagRoleId,
      "Server Tag removed for this guild",
    );
    return removed ? tagRoleId : null;
  }

  /**
   * §6, §7, §8, §9, §14 — snapshot, persist, strip, DM. Explicitly *not* a
   * Staff fire: no history event, no blacklist, no points, no status change.
   */
  private async applyStaffRestriction(
    member: GuildMember,
    tagRoleId: string | null,
  ): Promise<ServerTagOutcome> {
    const guildId = member.guild.id;

    if (!roleSnapshotService.botCanManageRoles(member.guild)) {
      log.error(`missing Manage Roles in ${guildId} — cannot apply tag restriction`);
      await serverTagLogService.post(guildId, {
        kind: "PROBLEM",
        userId: member.id,
        detail: M.log.problems.botMissingPermission,
      });
      return "blocked";
    }

    const snapshot = await roleSnapshotService.captureStaffRoles(member, guildId);
    if (snapshot.length === 0) {
      log.debug(`no managed staff roles on ${member.id} in ${guildId} — nothing to restrict`);
      await serverTagLogService.post(guildId, {
        kind: "TAG_DISABLED",
        userId: member.id,
        tagRoleId,
      });
      return "removed";
    }

    const created = await staffTagRestrictionService.createRestriction({
      guildId,
      staffId: member.id,
      savedRoleIds: snapshot,
    });

    // §20: a concurrent event already took the snapshot — do not take a second.
    if (created.outcome === "already-active") {
      log.debug(`restriction already active for ${member.id} in ${guildId}`);
      return "already";
    }

    const restriction = created.restriction;
    const removal = await roleSnapshotService.removeStaffRoles(
      member,
      snapshot,
      "Server Tag removed — temporary staff role restriction",
    );

    const durationMs = restriction.expiresAt.getTime() - restriction.startedAt.getTime();
    await serverTagLogService.post(guildId, {
      kind: "RESTRICTED",
      userId: member.id,
      savedRoleIds: snapshot,
      removedRoleIds: removal.removed,
      blockedRoleIds: removal.blocked,
      durationMs,
      expiresAt: restriction.expiresAt,
    });

    await serverTagLogService.dm(
      member.id,
      M.dm.restricted(durationMs, restriction.expiresAt),
    );

    log.info(
      `restriction ${restriction.restrictionId} created for ${member.id} in ${guildId} ` +
        `(${removal.removed.length}/${snapshot.length} roles removed)`,
    );
    return "restricted";
  }

  /**
   * §10 / §11 — shared close path for both "tag came back" and "3 days are up".
   * The status flip is claimed atomically first, so duplicate events cannot
   * restore twice.
   */
  async restoreRestriction(
    member: GuildMember,
    restriction: StaffTagRestrictionDocument,
    status: StaffTagRestrictionStatus,
    reason: StaffTagRestorationReason,
  ): Promise<ServerTagOutcome> {
    const guildId = restriction.guildId;

    // §12: a member fired or blacklisted mid-restriction does not get roles back.
    const lifecycle = await staffTagRestrictionService.canRestoreStaffRoles(
      guildId,
      restriction.staffId,
    );
    if (!lifecycle.allowed) {
      const cancelled = await staffTagRestrictionService.claimForClosure({
        restriction,
        status: StaffTagRestrictionStatus.CANCELLED,
        reason: StaffTagRestorationReason.STAFF_LIFECYCLE,
        restoredBy: BOT_ACTOR,
      });
      if (cancelled) {
        await staffTagRestrictionService.markRolesRestored(cancelled, false);
        await serverTagLogService.post(guildId, {
          kind: "BLOCKED",
          userId: restriction.staffId,
          staffStatus: lifecycle.status ?? "UNKNOWN",
        });
        log.warn(
          `restriction ${restriction.restrictionId} cancelled — staff status ${lifecycle.status}`,
        );
      }
      return "blocked";
    }

    const claimed = await staffTagRestrictionService.claimForClosure({
      restriction,
      status,
      reason,
      restoredBy: BOT_ACTOR,
    });
    // §20: someone else already closed this restriction — do not restore twice.
    if (!claimed) return "already";

    const outcome = await roleSnapshotService.restoreStaffRoles(
      member,
      claimed.savedRoleIds,
      reason === StaffTagRestorationReason.TAG_REAPPLIED
        ? "Server Tag re-applied — staff roles restored"
        : "Server Tag restriction expired — staff roles restored",
    );

    await staffTagRestrictionService.markRolesRestored(
      claimed,
      !outcome.failed,
      outcome.missing,
    );

    const byTag = reason === StaffTagRestorationReason.TAG_REAPPLIED;
    await serverTagLogService.post(guildId, {
      kind: "RESTORED",
      userId: member.id,
      reason,
      restoredRoleIds: outcome.restored,
      missingRoleIds: outcome.missing,
      blockedRoleIds: outcome.blocked,
      failed: outcome.failed,
    });

    const note = outcome.missing.length > 0 ? `\n\n${M.dm.partialRestoreNote}` : "";
    await serverTagLogService.dm(
      member.id,
      (byTag ? M.dm.restoredByTag : M.dm.restoredByExpiry) + note,
    );

    log.info(
      `restriction ${claimed.restrictionId} closed as ${status} (${reason}) — ` +
        `${outcome.restored.length} role(s) restored, ${outcome.missing.length} missing`,
    );
    return "restored";
  }

  /**
   * §12 — called on rejoin. Reconciles the Tag Role and settles any restriction
   * that is already due or already satisfied by an active tag.
   */
  async reconcileMember(member: GuildMember, now: Date = new Date()): Promise<ServerTagOutcome> {
    const guildId = member.guild.id;
    const usingTag = isUsingGuildTag(member.user, guildId);

    if (usingTag) await this.grantTagRole(member);
    else await this.removeTagRole(member);

    const restriction = await staffTagRestrictionService.getActiveRestriction(guildId, member.id);
    if (!restriction) return usingTag ? "granted" : "noop";

    if (restriction.expiresAt.getTime() <= now.getTime()) {
      return this.restoreRestriction(
        member,
        restriction,
        StaffTagRestrictionStatus.EXPIRED,
        StaffTagRestorationReason.DURATION_EXPIRED,
      );
    }

    if (usingTag) {
      return this.restoreRestriction(
        member,
        restriction,
        StaffTagRestrictionStatus.RESTORED,
        StaffTagRestorationReason.TAG_REAPPLIED,
      );
    }

    // Still restricted and still untagged — leave it running until it expires.
    return "noop";
  }
}

export const serverTagService = new ServerTagService();
