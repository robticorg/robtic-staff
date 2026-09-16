import { Events, type Client } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";
import { ticketService, transcriptCache } from "../modules/tickets/index.ts";

const log = logger.child("gateway");

export default defineEvent({
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>) {
    log.info(`Logged in as ${client.user.tag} — serving ${client.guilds.cache.size} guild(s)`);

    // Re-arm transcript capture for every ticket that was already open before
    // this restart — otherwise their conversation would silently stop being
    // buffered until the next close/delete falls back to a history fetch.
    try {
      const channelIds = await ticketService.listAllActiveChannelIds();
      for (const channelId of channelIds) transcriptCache.track(channelId);
      if (channelIds.length > 0) {
        log.info(`transcript capture re-armed for ${channelIds.length} open ticket(s)`);
      }
    } catch (err) {
      log.warn("transcript cache re-arm failed", err);
    }
  },
});
