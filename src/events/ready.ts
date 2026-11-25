import { ActivityType, Events, type Client } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";
import { ladderSyncService } from "../modules/configuration/index.ts";
import { hiddenStaffLevelSyncService } from "../modules/staff/hidden/index.ts";
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

    // The same status as every public Robtic bot, in turn.
    const status = ["Use /help to start", "Join us at robtic.org"];
    let next = 0;
    const show = () => {
      const text = status[next++ % status.length]!;
      client.user.setPresence({ activities: [{ name: text, state: text, type: ActivityType.Custom }] });
    };
    setTimeout(show, 2_000);
    setInterval(show, 15_000);

    for (const guild of client.guilds.cache.values()) {
      await ladderSyncService
        .sync(guild)
        .catch((err) => log.warn(`ladder sync failed for ${guild.id}`, err));
      void hiddenStaffLevelSyncService
        .syncGuild(guild)
        .catch((err) => log.warn(`hidden staff sync failed for ${guild.id}`, err));
    }

    await serverTagExpirationService
      .reconcileActive()
      .catch((err) => log.warn("server tag startup reconcile failed", err));

    serverTagAuditService.start();
  },
});
