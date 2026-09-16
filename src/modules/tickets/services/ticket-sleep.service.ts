import type { Guild, GuildMember, Message } from "discord.js";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { DomainError, ValidationError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { limits } from "../../../data/config/limits.ts";
import { formatArabicDuration } from "../../../data/server-tag/duration.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { parseDuration } from "../../punishment/services/duration.service.ts";
import { TicketModel, type Ticket } from "../models/ticket.model.ts";
import { ACTIVE_TICKET_STATUSES, TicketLogAction, TicketStatus } from "../types/enums.ts";
import { buildSleepDm } from "../render/sleep-dm.ts";
import { ticketConfigService } from "./ticket-config.service.ts";
import { canSleepTicket } from "./ticket-permissions.ts";
import { ticketLogService } from "./ticket-log.service.ts";
import { ticketService } from "./ticket.service.ts";
import { transcriptCache } from "./transcript-cache.ts";

const log = logger.child("tickets:sleep");
const M = ticketMessages;

type TicketDoc = HydratedDocument<Ticket>;

export interface SleepResult {
  ticket: TicketDoc;
  dueAt: Date;
  durationMs: number;

  duration: string;
  dmDelivered: boolean;
}

export function resolveSleepDuration(input: string | null | undefined): number {
  if (!input || input.trim().length === 0) return limits.ticketSleepDefaultMs;

  const parsed = parseDuration(input);
  if (parsed === null || parsed < limits.ticketSleepMinMs || parsed > limits.ticketSleepMaxMs) {
    throw new ValidationError(
      M.sleep.invalidDuration(
        formatArabicDuration(limits.ticketSleepMinMs),
        formatArabicDuration(limits.ticketSleepMaxMs),
      ),
    );
  }
  return parsed;
}

export class TicketSleepService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  async startSleep(input: {
    ticketId: string;
    actor: GuildMember;
    panel: TicketPanelConfig;
    durationMs: number;
  }): Promise<SleepResult> {
    const { actor, panel, durationMs } = input;
    const ticket = await ticketService.getTicketOrThrow(input.ticketId);

    if (!canSleepTicket(actor, panel, ticket)) {
      throw new ValidationError(M.sleep.notAllowed);
    }
    if (!(ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status)) {
      throw new ValidationError(M.sleep.notOpen);
    }
    if (ticket.sleepDueAt && ticket.sleepDueAt.getTime() > Date.now()) {
      throw new ValidationError(M.sleep.alreadySleeping(ticket.sleepDueAt));
    }

    const now = new Date();
    const dueAt = new Date(now.getTime() + durationMs);
    const duration = formatArabicDuration(durationMs);

    const updated = await TicketModel.findOneAndUpdate(
      { ticketId: ticket.ticketId, status: { $in: ACTIVE_TICKET_STATUSES as TicketStatus[] } },
      {
        $set: {
          sleepDueAt: dueAt,
          sleepStartedBy: actor.id,
          sleepStartedAt: now,
          sleepDurationMs: durationMs,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!updated) throw new DomainError("TICKET_GONE", M.common.ticketGone);

    const dmDelivered = await this.notifyOpener(actor.guild, updated, duration);

    await ticketLogService.record(TicketLogAction.TICKET_SLEEP, {
      guild: actor.guild,
      panel,
      ticketId: updated.ticketId,
      actorId: actor.id,
      targetId: updated.userId,
      name: duration,
      dueAt,
    });

    log.info(
      `ticket ${updated.ticketId} sleeping for ${duration} (by ${actor.id}), ` +
        `DM ${dmDelivered ? "delivered" : "failed"}`,
    );

    return { ticket: updated, dueAt, durationMs, duration, dmDelivered };
  }

  private async notifyOpener(
    guild: Guild,
    ticket: Ticket,
    duration: string,
  ): Promise<boolean> {
    const member = await guild.members.fetch(ticket.userId).catch(() => null);
    if (!member) return false;
    try {
      await member.send(
        buildSleepDm({ guildId: ticket.guildId, channelId: ticket.channelId, duration }),
      );
      return true;
    } catch (err) {
      log.warn(`sleep DM to ${ticket.userId} failed`, err);
      return false;
    }
  }

  async handleTicketMessage(message: Message): Promise<void> {
    if (!message.inGuild() || message.author.bot) return;

    if (!transcriptCache.isTracked(message.channelId)) return;

    const ticket = await TicketModel.findOne({
      channelId: message.channelId,
      userId: message.author.id,
      sleepDueAt: { $exists: true, $ne: null },
    }).exec();
    if (!ticket) return;

    const woken = await this.clearSleep(ticket.ticketId);
    if (!woken) return;

    const channel = message.channel;
    if (channel.isTextBased() && "send" in channel) {
      await channel
        .send({ content: M.sleep.cancelled(ticket.userId), allowedMentions: { parse: [] } })
        .catch(() => undefined);
    }

    const panel = ticketConfigService.getPanel(ticket.panelId);
    if (panel) {
      await ticketLogService.record(TicketLogAction.TICKET_SLEEP_CANCELLED, {
        guild: message.guild,
        panel,
        ticketId: ticket.ticketId,
        actorId: message.author.id,
        targetId: ticket.userId,
      });
    }
    log.info(`ticket ${ticket.ticketId} woke up — its opener replied`);
  }

  private async clearSleep(ticketId: string): Promise<boolean> {
    const result = await TicketModel.updateOne(
      { ticketId, sleepDueAt: { $exists: true, $ne: null } },
      { $unset: { sleepDueAt: "", sleepStartedBy: "", sleepStartedAt: "", sleepDurationMs: "" } },
    ).exec();
    return (result.modifiedCount ?? 0) > 0;
  }

  private listDue(now: Date): Promise<TicketDoc[]> {
    return TicketModel.find({
      sleepDueAt: { $lte: now },
      status: { $in: ACTIVE_TICKET_STATUSES as TicketStatus[] },
    })
      .sort({ sleepDueAt: 1 })
      .limit(limits.ticketSleepSweepBatch)
      .exec();
  }

  async sweep(now: Date = new Date()): Promise<{ closed: number; failed: number }> {
    const due = await this.listDue(now);
    let closed = 0;
    let failed = 0;

    for (const ticket of due) {
      try {
        if (await this.closeExpired(ticket)) closed += 1;
      } catch (err) {
        failed += 1;
        log.error(`auto-close failed for ${ticket.ticketId}`, err);
      }
    }

    if (closed + failed > 0) log.info(`sleep sweep: ${closed} closed, ${failed} failed`);
    return { closed, failed };
  }

  private async closeExpired(ticket: TicketDoc): Promise<boolean> {
    const { getTicketClient } = await import("../runtime.ts");
    const client = getTicketClient();
    if (!client) return false;

    const guild = client.guilds.cache.get(ticket.guildId);
    if (!guild) {
      log.warn(`ticket ${ticket.ticketId} is due but guild ${ticket.guildId} is unavailable`);
      return false;
    }
    const panel = ticketConfigService.getPanel(ticket.panelId);
    if (!panel) {
      await this.clearSleep(ticket.ticketId);
      log.warn(`ticket ${ticket.ticketId} is due but its panel "${ticket.panelId}" is gone`);
      return false;
    }

    if (!(await this.clearSleep(ticket.ticketId))) return false;

    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send({ content: M.sleep.autoClosed, allowedMentions: { parse: [] } })
        .catch(() => undefined);
    }

    const closedBy: UserId =
      ticket.sleepStartedBy ?? ticket.claimedByDiscordId ?? client.user?.id ?? "SYSTEM";
    const result = await ticketService.closeTicket(ticket.ticketId, closedBy, panel, guild);
    await ticketService.recordCompletionCredit(result.ticket).catch(() => undefined);

    log.info(`ticket ${ticket.ticketId} auto-closed — no reply within the sleep window`);
    return true;
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), limits.ticketSleepSweepIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`ticket sleep sweeper started (every ${limits.ticketSleepSweepIntervalMs}ms)`);
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
      log.error("ticket sleep sweep failed", err);
    } finally {
      this.running = false;
    }
  }
}

export const ticketSleepService = new TicketSleepService();
