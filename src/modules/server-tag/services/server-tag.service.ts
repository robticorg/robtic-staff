import type { Guild, GuildMember } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import {
  IdentityComplianceReason,
  isUsingGuildTag,
  staffIdentityRequirementService,
  type IdentityCompliance,
  type TagUserLike,
} from "../../staff-identity/index.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { staffService } from "../../staff/services/staff.service.ts";
import { staffPointService } from "../../staff/services/staff-point.service.ts";
import {
  SYSTEM_ACTOR,
  staffManagementService,
} from "../../staff/services/staff-management.service.ts";
import type { StaffTagRestrictionDocument } from "../models/staff-tag-restriction.model.ts";
import {
  StaffTagRestorationReason,
  StaffTagRestrictionKind,
  StaffTagRestrictionStatus,
  TagTransition,
} from "../types/enums.ts";
import { roleSnapshotService } from "./role-snapshot.service.ts";
import { staffTagRestrictionService } from "./staff-tag-restriction.service.ts";
import { serverTagLogService } from "./server-tag-log.service.ts";

const log = logger.child("server-tag");
const M = serverTagMessages;
const BOT_ACTOR = "BOT";

export {
  isUsingGuildTag,
  type PrimaryGuildLike,
  type TagUserLike,
} from "../../staff-identity/index.ts";

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
  | "staff-removed"
  | "compliant"
  | "noop"
  | "member-gone"
  | "already"
  | "blocked";

export async function fetchCurrentMember(guild: Guild, userId: UserId): Promise<GuildMember | null> {
  return guild.members
    .fetch({ user: userId, force: true })
    .catch(() => guild.members.fetch(userId))
    .catch(() => null);
}

function restorationReasonFor(compliance: IdentityCompliance): StaffTagRestorationReason {
  return compliance.reason === IdentityComplianceReason.DISPLAY_NAME
    ? StaffTagRestorationReason.DISPLAY_NAME_COMPLIANT
    : StaffTagRestorationReason.TAG_REAPPLIED;
}

export class ServerTagService {
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

  async handleTagRemoved(guild: Guild, userId: UserId): Promise<ServerTagOutcome> {
    const member = await fetchCurrentMember(guild, userId);
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

    if (staffIdentityRequirementService.isIdentityCompliant(member).compliant) {
      await serverTagLogService.post(guild.id, { kind: "TAG_DISABLED", userId, tagRoleId });
      return "compliant";
    }

    return this.applyStaffRestriction(member, tagRoleId);
  }

  async handleIdentityChange(guild: Guild, userId: UserId): Promise<ServerTagOutcome> {
    const member = await fetchCurrentMember(guild, userId);
    if (!member) return "member-gone";

    const compliance = staffIdentityRequirementService.isIdentityCompliant(member);
    const restriction = await staffTagRestrictionService.getActiveRestriction(guild.id, userId);

    if (compliance.compliant) {
      if (!restriction) return "noop";
      return this.restoreRestriction(
        member,
        restriction,
        StaffTagRestrictionStatus.RESTORED,
        restorationReasonFor(compliance),
      );
    }

    if (restriction) return "noop";
    if (!(await staffPermissionService.isStaff(member))) return "noop";
    return this.applyStaffRestriction(member, null);
  }

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
   * Parks the staff roles a fresh accept would have granted until the member wears the
   * server tag or an identifier in their name. Unlike a tag-removal restriction it never
   * expires — handleTagAdded / handleIdentityChange release it.
   */
  async holdUntilIdentity(
    member: GuildMember,
    roleIds: readonly string[],
  ): Promise<{ dmSent: boolean }> {
    const guildId = member.guild.id;
    const created = await staffTagRestrictionService.createRestriction({
      guildId,
      staffId: member.id,
      savedRoleIds: roleIds,
      kind: StaffTagRestrictionKind.AWAITING_IDENTITY,
      durationMs: 0,
    });

    if (created.outcome === "already-active") {
      if (created.restriction) {
        await staffTagRestrictionService.addSavedRoles(created.restriction, roleIds);
      }
    } else {
      await serverTagLogService.post(guildId, { kind: "AWAITING_IDENTITY", userId: member.id });
      log.info(
        `accept of ${member.id} in ${guildId} held — ${roleIds.length} role(s) wait for tag/identifier`,
      );
    }

    const dmSent = await serverTagLogService.dm(member.id, M.dm.awaitingIdentity);
    return { dmSent };
  }

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

  async restoreRestriction(
    member: GuildMember,
    restriction: StaffTagRestrictionDocument,
    status: StaffTagRestrictionStatus,
    reason: StaffTagRestorationReason,
  ): Promise<ServerTagOutcome> {
    const guildId = restriction.guildId;

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

    if (!claimed) return "already";

    const managed = await roleSnapshotService.managedStaffRoleIds(guildId);
    const restorable = claimed.savedRoleIds.filter(
      (id) => managed.has(id) || !member.guild.roles.cache.has(id),
    );

    const outcome = await roleSnapshotService.restoreStaffRoles(
      member,
      restorable,
      reason === StaffTagRestorationReason.TAG_REAPPLIED
        ? "Server Tag re-applied — staff roles restored"
        : reason === StaffTagRestorationReason.DISPLAY_NAME_COMPLIANT
          ? "Display name carries a Robtic identifier — staff roles restored"
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
      missingRoleIds: outcome.missing,
      blockedRoleIds: outcome.blocked,
      failed: outcome.failed,
    });

    const note = outcome.missing.length > 0 ? `\n\n${M.dm.partialRestoreNote}` : "";
    const restoredDm =
      claimed.kind === StaffTagRestrictionKind.AWAITING_IDENTITY
        ? M.dm.grantedAfterAccept
        : reason === StaffTagRestorationReason.DISPLAY_NAME_COMPLIANT
          ? M.dm.restoredByDisplayName
          : M.dm.restoredByTag;
    await serverTagLogService.dm(member.id, restoredDm + note);

    log.info(
      `restriction ${claimed.restrictionId} closed as ${status} (${reason}) — ` +
        `${outcome.restored.length} role(s) restored, ${outcome.missing.length} missing`,
    );
    return "restored";
  }

  async removeStaffPermanently(
    member: GuildMember,
    restriction: StaffTagRestrictionDocument,
  ): Promise<ServerTagOutcome> {
    const guildId = restriction.guildId;

    const staff = await staffService.get(member.id, guildId);
    if (!staff) {
      const cancelled = await staffTagRestrictionService.claimForClosure({
        restriction,
        status: StaffTagRestrictionStatus.CANCELLED,
        reason: StaffTagRestorationReason.STAFF_LIFECYCLE,
        restoredBy: BOT_ACTOR,
      });
      if (cancelled) await staffTagRestrictionService.markRolesRestored(cancelled, false);
      log.warn(`restriction ${restriction.restrictionId} due but ${member.id} has no staff record`);
      return "blocked";
    }

    const claimed = await staffTagRestrictionService.claimForClosure({
      restriction,
      status: StaffTagRestrictionStatus.EXPIRED,
      reason: StaffTagRestorationReason.DURATION_EXPIRED,
      restoredBy: BOT_ACTOR,
    });
    if (!claimed) return "already";

    const savedRoleIds = [...claimed.savedRoleIds];
    const pointsBefore = await staffPointService.getAllTimePoints(staff._id);

    await staffTagRestrictionService.markRolesRestored(claimed, false);

    try {
      await staffManagementService.fire(member, SYSTEM_ACTOR, false);
    } catch (err) {
      log.error(
        `PERMANENT REMOVAL INCOMPLETE for ${member.id} in ${guildId} — ` +
          `the staff record may still need a manual !fire`,
        err,
      );
    }

    const wipe = await staffPointService
      .resetToZero(staff._id, BOT_ACTOR)
      .catch((err) => {
        log.error(`points wipe failed for ${member.id} in ${guildId}`, err);
        return { reset: false, previousBalance: pointsBefore };
      });

    await serverTagLogService.post(guildId, {
      kind: "REMOVED",
      userId: member.id,
      pointsWiped: wipe.previousBalance,
    });
    await serverTagLogService.dm(member.id, M.dm.removedByExpiry);

    log.info(
      `restriction ${claimed.restrictionId} expired — ${member.id} removed from staff ` +
        `permanently in ${guildId} (${savedRoleIds.length} role(s) lost, ` +
        `${wipe.previousBalance} point(s) wiped)`,
    );
    return "staff-removed";
  }

  async reconcileMember(member: GuildMember, now: Date = new Date()): Promise<ServerTagOutcome> {
    const guildId = member.guild.id;
    const usingTag = isUsingGuildTag(member.user, guildId);

    if (usingTag) await this.grantTagRole(member);
    else await this.removeTagRole(member);

    const restriction = await staffTagRestrictionService.getActiveRestriction(guildId, member.id);
    if (!restriction) return usingTag ? "granted" : "noop";

    if (
      restriction.kind !== StaffTagRestrictionKind.AWAITING_IDENTITY &&
      restriction.expiresAt.getTime() <= now.getTime()
    ) {
      return this.removeStaffPermanently(member, restriction);
    }

    const compliance = staffIdentityRequirementService.isIdentityCompliant(member);
    if (compliance.compliant) {
      return this.restoreRestriction(
        member,
        restriction,
        StaffTagRestrictionStatus.RESTORED,
        restorationReasonFor(compliance),
      );
    }

    return "noop";
  }
}

export const serverTagService = new ServerTagService();
