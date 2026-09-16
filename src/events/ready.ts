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

    try {
      const channelIds = await ticketService.listAllActiveChannelIds();
      for (const channelId of channelIds) transcriptCache.track(channelId);
      if (channelIds.length > 0) {
        log.info(`transcript capture re-armed for ${channelIds.length} open ticket(s)`);
      }
    } catch (err) {
      log.warn("transcript cache re-arm failed", err);
    }

    for (const guild of client.guilds.cache.values()) {
      await ladderSyncService
        .sync(guild)
        .catch((err) => log.warn(`ladder sync failed for ${guild.id}`, err));
    }

    serverTagAuditService.start();
  },
});
