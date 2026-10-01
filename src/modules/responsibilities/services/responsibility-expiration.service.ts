import { logger } from "../../../shared/utils/logger.ts";
import { responsibilityLimits } from "../../../data/responsibilities/config.ts";
import { responsibilityAssignmentRepository } from "../repositories/responsibility-assignment.repository.ts";
import { getResponsibilityClient } from "../runtime.ts";
import { responsibilityAssignmentService } from "./responsibility-assignment.service.ts";

const log = logger.child("responsibilities:expiry");

export class ResponsibilityExpirationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  async sweep(now: Date = new Date()): Promise<number> {
    const client = getResponsibilityClient();
    if (!client) return 0;
    const due = await responsibilityAssignmentRepository.due(now, responsibilityLimits.sweepBatchSize);
    let expired = 0;
    for (const assignment of due) {
      const guild = client.guilds.cache.get(assignment.guildId);
      if (!guild) continue;
      try {
        if (await responsibilityAssignmentService.expireResponsibility(guild, assignment, now)) expired += 1;
      } catch (err) {
        log.error(`expiring responsibility assignment ${assignment.assignmentId} failed`, err);
      }
    }
    if (expired > 0) log.info(`sweep: expired ${expired} temporary responsibility(ies)`);
    return expired;
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), responsibilityLimits.sweepIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`responsibility expiry sweeper started (every ${responsibilityLimits.sweepIntervalMs}ms)`);
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
      log.error("responsibility sweep tick failed", err);
    } finally {
      this.running = false;
    }
  }
}

export const responsibilityExpirationService = new ResponsibilityExpirationService();
