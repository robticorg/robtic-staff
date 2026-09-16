import { Events, type DMChannel, type GuildChannel } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";
import { ticketService } from "../modules/tickets/services/ticket.service.ts";

const log = logger.child("channelDelete");

export default defineEvent({
  name: Events.ChannelDelete,
  async execute(channel: DMChannel | GuildChannel) {
    if (channel.isDMBased?.() || !("guild" in channel) || !channel.guild) return;

    try {
      await ticketService.handleManualChannelDelete({
        guild: channel.guild,
        channelId: channel.id,
      });
    } catch (err) {
      log.error(`manual ticket channel delete handling failed for ${channel.id}`, err);
    }
  },
});
