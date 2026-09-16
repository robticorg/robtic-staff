import { type Guild } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { TicketLogAction } from "../types/enums.ts";
import { buildTicketLogEmbed } from "../render/ticket-log-embed.ts";

const log = logger.child("tickets:log");

export interface TicketLogContext {
  guild: Guild;
  panel: TicketPanelConfig;
  ticketId: string;
  actorId: string;
  targetId?: string;
  roleId?: string;
  name?: string;
  /** Transfer only — the claimer the ticket was handed over from. */
  fromId?: string;
  reason?: string;
}

export class TicketLogService {
  async record(action: TicketLogAction, ctx: TicketLogContext): Promise<void> {
    const embed = buildTicketLogEmbed(action, ctx);
    if (!embed) return;

    try {
      // Panels that never open a channel (gift-claim) have no log channel; they
      // also never reach this service, but the field is optional either way.
      const logChannelId = ctx.panel.logChannelId;
      if (!logChannelId) return;

      const channel = await ctx.guild.channels.fetch(logChannelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        log.warn(`panel "${ctx.panel.id}" log channel unavailable`);
        return;
      }
      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (err) {
      log.warn("ticket log send failed", err);
    }
  }
}

export const ticketLogService = new TicketLogService();
