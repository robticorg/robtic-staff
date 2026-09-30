import type { Guild } from "discord.js";
import type { UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { buildMemberLeftNotice } from "../render/member-left.ts";
import { ticketService } from "./ticket.service.ts";

const log = logger.child("tickets:member-left");

export class TicketMemberLeftService {
  /**
   * The member left: tell staff in each of their open tickets and offer to close it.
   * Nothing closes on its own — the claimer (or an admin) decides. Returns how many
   * tickets were notified.
   */
  async notify(guild: Guild, userId: UserId): Promise<number> {
    const tickets = await ticketService.listOpenForUser(guild.id, userId);
    let notified = 0;

    for (const ticket of tickets) {
      try {
        const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
        if (!channel?.isTextBased() || !("send" in channel)) continue;
        await channel.send(buildMemberLeftNotice(ticket));
        notified += 1;
      } catch (err) {
        log.warn(`member-left notice for ticket ${ticket.ticketId} failed`, err);
      }
    }

    if (notified > 0) log.info(`${userId} left ${guild.id} — notified ${notified} open ticket(s)`);
    return notified;
  }
}

export const ticketMemberLeftService = new TicketMemberLeftService();
