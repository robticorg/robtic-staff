import { logger } from "../../../shared/utils/logger.ts";
import { vacationConfig } from "../../../data/vacation/config.ts";
import { vacationService, type ExpiryOutcome } from "./vacation.service.ts";

const log = logger.child("vacation:expiry");

export class VacationExpirationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  async sweep(now: Date = new Date()): Promise<Record<ExpiryOutcome, number>> {
    const tally: Record<ExpiryOutcome, number> = {
      completed: 0,
      "completed-no-restore": 0,
      deferred: 0,
      already: 0,
      skipped: 0,
    };
    const due = await vacationService.listExpirable(now, vacationConfig.sweepBatchSize);
    for (const vacation of due) {
      try {
        const outcome = await vacationService.expireVacation(vacation);
        tally[outcome] += 1;
      } catch (err) {
        log.error(`expireVacation failed for ${vacation.vacationId}`, err);
      }
    }
    if (due.length > 0) {
      log.info(
        `sweep: ${tally.completed} completed, ${tally["completed-no-restore"]} forced, ` +
          `${tally.deferred} deferred, ${tally.already} already, ${tally.skipped} skipped`,
      );
    }
    return tally;
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), vacationConfig.sweepIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`expiry sweeper started (every ${vacationConfig.sweepIntervalMs}ms)`);
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
      log.error("sweep tick failed", err);
    } finally {
      this.running = false;
    }
  }
}

export const vacationExpirationService = new VacationExpirationService();
