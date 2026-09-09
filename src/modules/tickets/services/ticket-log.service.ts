import { type Guild } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { TicketLogAction } from "../types/enums.ts";

const log = logger.child("tickets:log");
const L = ticketMessages.log;

export interface TicketLogContext {
  guild: Guild;
  panel: TicketPanelConfig;
  ticketId: string;
  actorId: string;
  targetId?: string;
  roleId?: string;
  name?: string;
}

export class TicketLogService {
  async record(action: TicketLogAction, ctx: TicketLogContext): Promise<void> {
    const content = this.format(action, ctx);
    if (!content) return;

    try {
      const channel = await ctx.guild.channels.fetch(ctx.panel.logChannelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        log.warn(`panel "${ctx.panel.id}" log channel unavailable`);
        return;
      }
      await channel.send({ content, allowedMentions: { parse: [] } });
    } catch (err) {
      log.warn("ticket log send failed", err);
    }
  }

  private format(action: TicketLogAction, c: TicketLogContext): string | null {
    switch (action) {
      case TicketLogAction.TICKET_CREATED:
        return L.created(c.ticketId, c.actorId, c.panel.name);
      case TicketLogAction.TICKET_CLAIMED:
        return L.claimed(c.ticketId, c.actorId);
      case TicketLogAction.TICKET_RENAMED:
        return L.renamed(c.ticketId, c.name ?? "?", c.actorId);
      case TicketLogAction.TICKET_CLOSED:
        return L.closed(c.ticketId, c.actorId);
      case TicketLogAction.TICKET_DELETED:
        return L.deleted(c.ticketId, c.actorId);
      case TicketLogAction.USER_ADDED:
        return c.targetId ? L.userAdded(c.ticketId, c.targetId, c.actorId) : null;
      case TicketLogAction.USER_REMOVED:
        return c.targetId ? L.userRemoved(c.ticketId, c.targetId, c.actorId) : null;
      case TicketLogAction.ROLE_ADDED:
        return c.roleId ? L.roleAdded(c.ticketId, c.roleId, c.actorId) : null;
      case TicketLogAction.ROLE_REMOVED:
        return c.roleId ? L.roleRemoved(c.ticketId, c.roleId, c.actorId) : null;
      default:
        return null;
    }
  }
}

export const ticketLogService = new TicketLogService();
