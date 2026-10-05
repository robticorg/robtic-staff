import { Events, type Client } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";
import { ticketService, transcriptCache } from "../modules/tickets/index.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";
import { hiddenStaffLevelSyncService } from "../modules/staff/hidden/index.ts";
import { ticketPanelSettingsService } from "../modules/tickets/services/ticket-panel-settings.service.ts";
import { giftDeliveryRecoveryService } from "../modules/gift-claims/services/delivery/gift-delivery-recovery.service.ts";
import {
  serverTagAuditService,
  serverTagExpirationService,
} from "../modules/server-tag/index.ts";

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
      await ticketPanelSettingsService
        .loadGuild(guild.id)
        .catch((err) => log.warn(`ticket panel settings load failed for ${guild.id}`, err));
      await ladderSyncService
        .sync(guild)
        .catch((err) => log.warn(`ladder sync failed for ${guild.id}`, err));
      void hiddenStaffLevelSyncService
        .syncGuild(guild)
        .catch((err) => log.warn(`hidden staff sync failed for ${guild.id}`, err));
    }

    await giftDeliveryRecoveryService
      .reconcileOnStartup()
      .catch((err) => log.warn("gift delivery startup reconcile failed", err));

    await serverTagExpirationService
      .reconcileActive()
      .catch((err) => log.warn("server tag startup reconcile failed", err));

    serverTagAuditService.start();
  },
});
