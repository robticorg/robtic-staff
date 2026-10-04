import type { Guild } from "discord.js";
import { claimReleaseConfig as C } from "../../../data/tickets/claim-release.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { hasAdminAccess } from "../../access/index.ts";
import { StaffTagRestrictionModel } from "../../server-tag/models/staff-tag-restriction.model.ts";
import { StaffTagRestrictionKind } from "../../server-tag/types/enums.ts";
import type { StaffOffDutyEvent } from "../../staff/services/staff-duty-events.ts";
import { staffService } from "../../staff/services/staff.service.ts";
import {
  TicketClaimCheckModel,
  TicketClaimCheckStatus,
  type TicketClaimCheckDocument,
} from "../models/ticket-claim-check.model.ts";
import { getTicketClient } from "../runtime.ts";
import { decideClaimRelease, type ClaimReleaseDecision } from "./claim-release-decision.ts";

const log = logger.child("tickets:claim-check");

export interface ClaimCheckDeps {
  release(guild: Guild, event: StaffOffDutyEvent): Promise<number>;
}

export class TicketClaimCheckService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private deps: ClaimCheckDeps | null = null;

  useRelease(deps: ClaimCheckDeps): void {
    this.deps = deps;
  }

  async schedule(event: StaffOffDutyEvent, now: Date = new Date()): Promise<void> {
    const dueAt = new Date(now.getTime() + C.checkDelayMs);
    await TicketClaimCheckModel.findOneAndUpdate(
      { guildId: event.guildId, userId: event.userId, status: TicketClaimCheckStatus.PENDING },
      { $set: { actorId: event.actorId, reason: event.reason, dueAt } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();
    log.info(`claim check for ${event.userId} (${event.reason}) scheduled at ${dueAt.toISOString()}`);
  }

  async decide(guild: Guild, userId: string, now: Date): Promise<ClaimReleaseDecision> {
    const [member, staff, tag] = await Promise.all([
      guild.members.fetch(userId).catch(() => null),
      staffService.get(userId, guild.id),
      StaffTagRestrictionModel.findOne(
        { guildId: guild.id, staffId: userId, kind: StaffTagRestrictionKind.TAG_REMOVED },
        { startedAt: 1 },
      )
        .sort({ startedAt: -1 })
        .lean()
        .exec(),
    ]);
    return decideClaimRelease({
      isAdministrator: hasAdminAccess(member ?? { id: userId }),
      staffStatus: staff?.status ?? null,
      tagRemovedAt: tag?.startedAt ?? null,
      now,
      tagGraceMs: C.tagGraceMs,
    });
  }

  async process(check: TicketClaimCheckDocument, guild: Guild, now: Date): Promise<string> {
    const decision = await this.decide(guild, check.userId, now);
    if (decision.action === "WAIT") {
      await TicketClaimCheckModel.updateOne(
        { checkId: check.checkId },
        { $set: { status: TicketClaimCheckStatus.PENDING, dueAt: decision.until } },
      ).exec();
      return `WAIT until ${decision.until.toISOString()}`;
    }

    let outcome: string = decision.action === "KEEP" ? `KEEP (${decision.why})` : "RELEASE";
    if (decision.action === "RELEASE" && this.deps) {
      const released = await this.deps.release(guild, {
        guildId: check.guildId,
        userId: check.userId,
        actorId: check.actorId,
        reason: check.reason,
      });
      outcome = `RELEASE (${released} ticket(s))`;
    }
    await TicketClaimCheckModel.updateOne(
      { checkId: check.checkId },
      { $set: { status: TicketClaimCheckStatus.DONE, outcome } },
    ).exec();
    return outcome;
  }

  async sweep(now: Date = new Date()): Promise<number> {
    const client = getTicketClient();
    if (!client) return 0;
    let handled = 0;
    for (let i = 0; i < C.sweepBatchSize; i += 1) {
      const check = await TicketClaimCheckModel.findOneAndUpdate(
        { status: TicketClaimCheckStatus.PENDING, dueAt: { $lte: now } },
        { $set: { status: TicketClaimCheckStatus.PROCESSING } },
        { sort: { dueAt: 1 }, returnDocument: "after" },
      ).exec();
      if (!check) break;
      try {
        const guild = await client.guilds.fetch(check.guildId).catch(() => null);
        if (!guild) {
          await TicketClaimCheckModel.updateOne(
            { checkId: check.checkId },
            { $set: { status: TicketClaimCheckStatus.DONE, outcome: "GUILD_GONE" } },
          ).exec();
          continue;
        }
        const outcome = await this.process(check, guild, now);
        log.info(`claim check ${check.checkId} for ${check.userId}: ${outcome}`);
        handled += 1;
      } catch (err) {
        log.error(`claim check ${check.checkId} failed`, err);
        await TicketClaimCheckModel.updateOne(
          { checkId: check.checkId, status: TicketClaimCheckStatus.PROCESSING },
          { $set: { status: TicketClaimCheckStatus.PENDING, dueAt: new Date(now.getTime() + C.sweepIntervalMs) } },
        )
          .exec()
          .catch(() => undefined);
      }
    }
    return handled;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.sweep();
    } catch (err) {
      log.error("claim check sweep failed", err);
    } finally {
      this.running = false;
    }
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), C.sweepIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`claim check sweeper started (every ${C.sweepIntervalMs}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const ticketClaimCheckService = new TicketClaimCheckService();
