import { Events, type Client } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";
import { ticketService, transcriptCache } from "../modules/tickets/index.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";
import { serverTagAuditService } from "../modules/server-tag/index.ts";

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

    // The role order may have changed while the process was down, so the band
    // is re-derived once per guild before anything reads a level from it.
    for (const guild of client.guilds.cache.values()) {
      await ladderSyncService
        .sync(guild)
        .catch((err) => log.warn(`ladder sync failed for ${guild.id}`, err));
    }

    // Catch-up for every Server Tag change the gateway could not tell us about
    // (roles handed out by hand, tags toggled while offline). Runs detached —
    // a full member fetch must not hold up the rest of startup.
    serverTagAuditService.start();
  },
});
