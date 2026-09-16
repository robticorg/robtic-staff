import { logger } from "../../../shared/utils/logger.ts";
import { serverTagConfig } from "../../../data/server-tag/config.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import type { StaffTagRestrictionDocument } from "../models/staff-tag-restriction.model.ts";
import { StaffTagRestorationReason, StaffTagRestrictionStatus } from "../types/enums.ts";
import { getServerTagClient } from "../runtime.ts";
import { serverTagService } from "./server-tag.service.ts";
import { staffTagRestrictionService } from "./staff-tag-restriction.service.ts";
import { serverTagLogService } from "./server-tag-log.service.ts";

const log = logger.child("server-tag:expiry");
const M = serverTagMessages;

export type TagExpiryOutcome =
  | "restored"
  | "blocked"
  | "already"
  | "member-absent"
  | "guild-absent";

/**
 * §11 / §26 — MongoDB is the source of truth, so a restart simply re-reads the
 * ACTIVE rows. `start()` sweeps immediately, which *is* the startup recovery:
 * anything that expired while the process was down is settled on boot.
 */
export class ServerTagExpirationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  async sweep(now: Date = new Date()): Promise<Record<TagExpiryOutcome, number>> {
    const tally: Record<TagExpiryOutcome, number> = {
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
        tally[await this.expireRestriction(restriction)] += 1;
      } catch (err) {
        log.error(`expireRestriction failed for ${restriction.restrictionId}`, err);
      }
    }

    if (due.length > 0) {
      log.info(
        `sweep: ${tally.restored} restored, ${tally.blocked} blocked, ` +
          `${tally["member-absent"]} absent, ${tally["guild-absent"]} no-guild, ${tally.already} already`,
      );
    }
    return tally;
  }

  /**
   * §11 — restoration after the window does NOT require the tag to come back.
   */
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
      // §12 — the member left. Keep the restriction so a rejoin can settle it;
      // never delete it and never close it without handing the roles back.
      log.debug(
        `restriction ${restriction.restrictionId} due but ${restriction.staffId} is not in the guild`,
      );
      await serverTagLogService.post(restriction.guildId, {
        kind: "PROBLEM",
        userId: restriction.staffId,
        detail: M.log.problems.memberGone,
      });
      return "member-absent";
    }

    const outcome = await serverTagService.restoreRestriction(
      member,
      restriction,
      StaffTagRestrictionStatus.EXPIRED,
      StaffTagRestorationReason.DURATION_EXPIRED,
    );

    if (outcome === "restored") return "restored";
    if (outcome === "already") return "already";
    return "blocked";
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
    } catch (err) {
      log.error("server tag sweep tick failed", err);
    } finally {
      this.running = false;
    }
  }
}

export const serverTagExpirationService = new ServerTagExpirationService();
