import type { Guild, GuildMember } from "discord.js";
import type { RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { sleep } from "../../../shared/utils/sleep.ts";
import { serverTagConfig } from "../../../data/server-tag/config.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { getServerTagClient } from "../runtime.ts";
import { isUsingGuildTag, serverTagService } from "./server-tag.service.ts";
import { roleSnapshotService } from "./role-snapshot.service.ts";
import { staffTagRestrictionService } from "./staff-tag-restriction.service.ts";

const log = logger.child("server-tag:audit");

export const TagAuditAction = {
  /** Tag is on but the Tag Role is missing — grant it (and lift a restriction). */
  GRANT: "GRANT",
  /** Tag is off — drop the Tag Role and, for staff, run the restriction path. */
  REVOKE: "REVOKE",
  /** Tag and role are both correct, but a restriction is still running. */
  LIFT: "LIFT",
  NONE: "NONE",
} as const;
export type TagAuditAction = (typeof TagAuditAction)[keyof typeof TagAuditAction];

export interface AuditMemberInput {
  usingTag: boolean;
  hasTagRole: boolean;
  /** Guild staff (any configured staff role) — decides who the 3 days apply to. */
  isStaff: boolean;
  hasActiveRestriction: boolean;
}

/**
 * The whole point of the audit: decide from *state alone*, because no event is
 * available to tell us what changed. Anything already consistent returns NONE
 * so a sweep over a full guild neither writes roles nor floods the log channel.
 */
export function decideAuditAction(input: AuditMemberInput): TagAuditAction {
  if (input.usingTag) {
    if (!input.hasTagRole) return TagAuditAction.GRANT;
    // Role and tag agree — but the "tag came back" event can have been missed
    // while the bot was down, leaving their staff roles stripped for nothing.
    return input.hasActiveRestriction ? TagAuditAction.LIFT : TagAuditAction.NONE;
  }

  // No tag. Either they still hold the role, or they are staff who owe the
  // restriction — a non-staff member without the role is simply not our business.
  if (input.hasTagRole) return TagAuditAction.REVOKE;
  if (input.isStaff && !input.hasActiveRestriction) return TagAuditAction.REVOKE;
  return TagAuditAction.NONE;
}

export interface AuditTally {
  scanned: number;
  granted: number;
  revoked: number;
  lifted: number;
  unchanged: number;
  /** Looked untagged in the cache, but a fresh fetch did not confirm it. */
  unverified: number;
  failed: number;
}

function emptyTally(): AuditTally {
  return {
    scanned: 0,
    granted: 0,
    revoked: 0,
    lifted: 0,
    unchanged: 0,
    unverified: 0,
    failed: 0,
  };
}

/**
 * Reconciles the Tag Role against the *actual* Server Tag for every member of a
 * guild. Live `userUpdate` events remain the fast path — this is the catch-up
 * for everything they could not see: roles assigned by hand, tags toggled while
 * the process was down, members who joined before the role was configured.
 */
export class ServerTagAuditService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  async auditGuild(guild: Guild): Promise<AuditTally> {
    const tally = emptyTally();

    const tagRoleId = await roleSnapshotService.getTagRoleId(guild.id);
    if (!tagRoleId) {
      log.debug(`no TAG role configured for ${guild.id} — nothing to reconcile`);
      return tally;
    }
    if (!guild.roles.cache.has(tagRoleId)) {
      log.warn(`configured tag role ${tagRoleId} no longer exists in ${guild.id} — audit skipped`);
      return tally;
    }

    // Both resolved once per guild: the per-member checks below must stay
    // synchronous, otherwise a large guild pays a round-trip per member.
    const [staffRoleIds, restricted] = await Promise.all([
      staffPermissionService.staffRoleIds(guild.id),
      staffTagRestrictionService.listActiveStaffIds(guild.id),
    ]);

    const members = await guild.members.fetch();

    for (const member of members.values()) {
      if (member.user.bot) continue;
      tally.scanned += 1;

      const action = decideAuditAction({
        usingTag: isUsingGuildTag(member.user, guild.id),
        hasTagRole: member.roles.cache.has(tagRoleId),
        isStaff: holdsStaffRole(member, staffRoleIds),
        hasActiveRestriction: restricted.has(member.id),
      });

      if (action === TagAuditAction.NONE) {
        tally.unchanged += 1;
        continue;
      }

      try {
        if (action === TagAuditAction.REVOKE && !(await this.confirmUntagged(member))) {
          tally.unverified += 1;
          continue;
        }
        await this.apply(guild, member.id, action);
        if (action === TagAuditAction.GRANT) tally.granted += 1;
        else if (action === TagAuditAction.REVOKE) tally.revoked += 1;
        else tally.lifted += 1;
      } catch (err) {
        tally.failed += 1;
        log.error(`audit ${action} failed for ${member.id} in ${guild.id}`, err);
      }

      if (serverTagConfig.auditActionDelayMs > 0) {
        await sleep(serverTagConfig.auditActionDelayMs);
      }
    }

    if (tally.granted + tally.revoked + tally.lifted + tally.unverified + tally.failed > 0) {
      log.info(
        `audit ${guild.id}: ${tally.scanned} scanned — ${tally.granted} granted, ` +
          `${tally.revoked} revoked, ${tally.lifted} lifted, ` +
          `${tally.unverified} unverified, ${tally.failed} failed`,
      );
    } else {
      log.debug(`audit ${guild.id}: ${tally.scanned} scanned, nothing to fix`);
    }
    return tally;
  }

  /**
   * The destructive half needs proof, exactly like `detectTagState` refuses to
   * act on an unverified DISABLED. A cached user whose payload never carried
   * `primary_guild` is indistinguishable from one who really has no tag — both
   * read as `primaryGuild: null` — so a forced fetch re-asks the API before any
   * staff member loses roles. No answer means no action.
   */
  private async confirmUntagged(member: GuildMember): Promise<boolean> {
    const fresh = await member.client.users.fetch(member.id, { force: true }).catch(() => null);
    if (!fresh) {
      log.warn(`could not re-verify tag state for ${member.id} in ${member.guild.id} — skipped`);
      return false;
    }
    if (isUsingGuildTag(fresh, member.guild.id)) {
      log.debug(`${member.id} looked untagged in cache but the fresh fetch says otherwise`);
      return false;
    }
    return true;
  }

  /**
   * GRANT and LIFT are the same entry point: `handleTagAdded` grants the role
   * when it is missing and closes an ACTIVE restriction when one exists, and it
   * only writes the "tag enabled" log line when there was no restriction.
   */
  private apply(guild: Guild, userId: string, action: TagAuditAction): Promise<unknown> {
    return action === TagAuditAction.REVOKE
      ? serverTagService.handleTagRemoved(guild, userId)
      : serverTagService.handleTagAdded(guild, userId);
  }

  async auditAll(): Promise<AuditTally> {
    const total = emptyTally();
    const client = getServerTagClient();
    if (!client) {
      log.warn("audit requested before the client was attached");
      return total;
    }

    for (const guild of client.guilds.cache.values()) {
      try {
        const tally = await this.auditGuild(guild);
        total.scanned += tally.scanned;
        total.granted += tally.granted;
        total.revoked += tally.revoked;
        total.lifted += tally.lifted;
        total.unchanged += tally.unchanged;
        total.unverified += tally.unverified;
        total.failed += tally.failed;
      } catch (err) {
        log.error(`audit failed for guild ${guild.id}`, err);
      }
    }
    return total;
  }

  /** Called once the gateway is ready — the boot-time catch-up. */
  start(): void {
    void this.tick();
    if (serverTagConfig.auditIntervalMs <= 0 || this.timer) return;
    this.timer = setInterval(() => void this.tick(), serverTagConfig.auditIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`server tag audit scheduled every ${serverTagConfig.auditIntervalMs}ms`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    // A sweep can outlive its own interval on a big guild — never overlap two.
    if (this.running) return;
    this.running = true;
    try {
      await this.auditAll();
    } catch (err) {
      log.error("server tag audit tick failed", err);
    } finally {
      this.running = false;
    }
  }
}

function holdsStaffRole(member: GuildMember, staffRoleIds: Set<RoleId>): boolean {
  if (staffRoleIds.size === 0) return false;
  return member.roles.cache.some((role) => staffRoleIds.has(role.id));
}

export const serverTagAuditService = new ServerTagAuditService();
