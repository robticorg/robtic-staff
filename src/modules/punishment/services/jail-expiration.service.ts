import { logger } from "../../../shared/utils/logger.ts";
import { punishmentConfig } from "../../../data/config/punishment.ts";
import { getPunishmentClient } from "../runtime.ts";
import { moderationActionService } from "./moderation-action.service.ts";
import { punishmentService } from "./punishment.service.ts";

const log = logger.child("punishment:jail-expiry");

/** Lifts timed jails (`!jail @user reason 3d`) once their time is up. */
export class JailExpirationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  async sweep(now: Date = new Date()): Promise<number> {
    const client = getPunishmentClient();
    if (!client) return 0;

    const due = await punishmentService.listExpiredJails(now, punishmentConfig.jailSweepBatchSize);
    let lifted = 0;
    for (const punishment of due) {
      const guild = client.guilds.cache.get(punishment.guildId);
      // Not in that guild any more — leave it; nothing to lift from here.
      if (!guild) continue;
      try {
        if (await moderationActionService.expireJail(guild, punishment)) lifted += 1;
      } catch (err) {
        log.error(`expiring jail ${punishment.punishmentId} failed`, err);
      }
    }
    if (lifted > 0) log.info(`sweep: lifted ${lifted} timed jail(s)`);
    return lifted;
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), punishmentConfig.jailSweepIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`jail expiry sweeper started (every ${punishmentConfig.jailSweepIntervalMs}ms)`);
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
      log.error("jail sweep tick failed", err);
    } finally {
      this.running = false;
    }
  }
}

export const jailExpirationService = new JailExpirationService();
