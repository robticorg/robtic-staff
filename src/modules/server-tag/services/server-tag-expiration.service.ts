import { inGuildLang } from "../../configuration/services/guild-lang.ts";
import { staffPolicyService } from "../../configuration/services/staff-policy.service.ts";
import { staffIdentityRequirementService } from "../../staff-identity/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { serverTagConfig } from "../../../data/server-tag/config.ts";
import type { StaffTagRestrictionDocument } from "../models/staff-tag-restriction.model.ts";
import { getServerTagClient } from "../runtime.ts";
import { fetchCurrentMember, serverTagService } from "./server-tag.service.ts";
import { staffTagRestrictionService } from "./staff-tag-restriction.service.ts";

const log = logger.child("server-tag:expiry");

/** How often (in sweeps) held members are released in servers with the identity check off. */
const RELEASE_EVERY_TICKS = 5;

export type TagExpiryOutcome =
  | "staff-removed"
  | "restored"
  | "blocked"
  | "already"
  | "member-absent"
  | "guild-absent";

export class ServerTagExpirationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private ticks = 0;

  async sweep(now: Date = new Date()): Promise<Record<TagExpiryOutcome, number>> {
    const tally: Record<TagExpiryOutcome, number> = {
      "staff-removed": 0,
      restored: 0,
      blocked: 0,
      already: 0,
      "member-absent": 0,
      "guild-absent": 0,
    };

    const due = await staffTagRestrictionService.listExpirable(
      now,
      serverTagConfig.sweepBatchSize,
    );
    for (const restriction of due) {
      try {
        tally[await inGuildLang(restriction.guildId, () => this.expireRestriction(restriction))] += 1;
      } catch (err) {
        log.error(`expireRestriction failed for ${restriction.restrictionId}`, err);
      }
    }

    if (due.length > 0) {
      log.info(
        `sweep: ${tally["staff-removed"]} removed from staff, ${tally.restored} restored, ${tally.blocked} blocked, ` +
          `${tally["member-absent"]} absent, ${tally["guild-absent"]} no-guild, ${tally.already} already`,
      );
    }
    return tally;
  }

  async expireRestriction(
    restriction: StaffTagRestrictionDocument,
  ): Promise<TagExpiryOutcome> {
    if (!restriction.isActive) return "already";

    const client = getServerTagClient();
    if (!client) return "guild-absent";

    const guild = client.guilds.cache.get(restriction.guildId);
    if (!guild) return "guild-absent";

    const member = await guild.members.fetch(restriction.staffId).catch(() => null);
    if (!member) {
      log.debug(
        `restriction ${restriction.restrictionId} due but ${restriction.staffId} is not in the guild`,
      );
      return "member-absent";
    }

    // Fixed it at the last minute, or the server turned the identity check off: give the roles back instead.
    if ((await staffIdentityRequirementService.checkMember(member)).compliant) {
      return (await serverTagService.reconcileMember(member)) === "restored" ? "restored" : "already";
    }

    const outcome = await serverTagService.removeStaffPermanently(member, restriction);

    if (outcome === "staff-removed") return "staff-removed";
    if (outcome === "already") return "already";
    return "blocked";
  }

  async reconcileActive(now: Date = new Date()): Promise<number> {
    const client = getServerTagClient();
    if (!client) return 0;

    let settled = 0;
    for (const guild of client.guilds.cache.values()) {
      const staffIds = await staffTagRestrictionService.listActiveStaffIds(guild.id);
      for (const staffId of staffIds) {
        try {
          const member = await fetchCurrentMember(guild, staffId);
          if (!member) continue;
          const outcome = await inGuildLang(guild.id, () => serverTagService.reconcileMember(member, now));
          if (outcome === "restored" || outcome === "staff-removed") settled += 1;
        } catch (err) {
          log.error(`startup reconcile failed for ${staffId} in ${guild.id}`, err);
        }
      }
    }
    if (settled > 0) log.info(`startup reconcile settled ${settled} restriction(s)`);
    return settled;
  }

  /**
   * Servers that turned the identity check off on the dashboard: everyone still held (waiting for the tag after an
   * accept, or paused for losing it) gets their roles back. Runs every few sweeps.
   */
  async releaseWhereCheckOff(): Promise<number> {
    const client = getServerTagClient();
    if (!client) return 0;

    let released = 0;
    for (const guild of client.guilds.cache.values()) {
      const policy = await staffPolicyService.get(guild.id).catch(() => null);
      if (!policy || policy.features.identityCheck) continue;
      const staffIds = await staffTagRestrictionService.listActiveStaffIds(guild.id);
      for (const staffId of staffIds) {
        try {
          const member = await fetchCurrentMember(guild, staffId);
          if (!member) continue;
          if ((await inGuildLang(guild.id, () => serverTagService.reconcileMember(member))) === "restored") released += 1;
        } catch (err) {
          log.error(`release (check off) failed for ${staffId} in ${guild.id}`, err);
        }
      }
    }
    if (released > 0) log.info(`identity check off: released ${released} held staff member(s)`);
    return released;
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), serverTagConfig.sweepIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`server tag expiry sweeper started (every ${serverTagConfig.sweepIntervalMs}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.sweep();
      if (this.ticks++ % RELEASE_EVERY_TICKS === 0) await this.releaseWhereCheckOff();
    } catch (err) {
      log.error("server tag sweep tick failed", err);
    } finally {
      this.running = false;
    }
  }
}

export const serverTagExpirationService = new ServerTagExpirationService();
