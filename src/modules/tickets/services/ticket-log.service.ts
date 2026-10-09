import { type Guild } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { TicketLogAction } from "../types/enums.ts";
import { buildTicketLogCard } from "../render/ticket-log-card.ts";
import { recordTicketEvent } from "./ticket-history.ts";
import { channelConfigService } from "../../configuration/services/channel-config.service.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { TicketModel, ticketName } from "../models/ticket.model.ts";

const log = logger.child("tickets:log");

export interface TicketLogContext {
  guild: Guild;
  panel: TicketPanelConfig;
  ticketId: string;
  /** The ticket's name for people (`support-1`); looked up when left out. */
  ticketName?: string;
  actorId: string;
  targetId?: string;
  roleId?: string;
  name?: string;

  fromId?: string;
  reason?: string;

  dueAt?: Date;
}

/** The one extra fact worth keeping per action in the ticket's history. */
function historyDetail(action: TicketLogAction, ctx: TicketLogContext): string | null {
  switch (action) {
    case TicketLogAction.TICKET_RENAMED:
      return ctx.name ?? null;
    case TicketLogAction.TICKET_TRANSFERRED:
    case TicketLogAction.TICKET_UNCLAIMED:
      return ctx.reason ?? null;
    case TicketLogAction.TICKET_SLEEP:
      return ctx.name ?? null; // the duration text
    case TicketLogAction.ROLE_ADDED:
    case TicketLogAction.ROLE_REMOVED:
      return ctx.roleId ? `<@&${ctx.roleId}>` : null;
    default:
      return null;
  }
}

export class TicketLogService {
  async record(action: TicketLogAction, ctx: TicketLogContext): Promise<void> {
    // Kept on the ticket too (for !ticket), even when the panel has no log room.
    await recordTicketEvent(ctx.ticketId, {
      action,
      actorId: ctx.actorId,
      ...(ctx.targetId ? { targetId: ctx.targetId } : {}),
      ...(historyDetail(action, ctx) ? { detail: historyDetail(action, ctx)! } : {}),
    });

    if (!ctx.ticketName) {
      const row = await TicketModel.findOne({ ticketId: ctx.ticketId }, { ticketId: 1, name: 1 }).lean().exec().catch(() => null);
      ctx = { ...ctx, ticketName: row ? ticketName(row) : ctx.ticketId };
    }
    const card = buildTicketLogCard(action, ctx);
    if (!card) return;

    try {
      const logChannelId =
        ctx.panel.logChannelId ??
        (await channelConfigService.getChannelId(ctx.guild.id, ChannelConfigType.TICKET_LOG));
      if (!logChannelId) return;

      const channel = await ctx.guild.channels.fetch(logChannelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        log.warn(`panel "${ctx.panel.id}" log channel unavailable`);
        return;
      }
      await channel.send(card);
    } catch (err) {
      log.warn("ticket log send failed", err);
    }
  }
}

export const ticketLogService = new TicketLogService();
