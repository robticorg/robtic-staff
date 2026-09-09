import { Events, type Client } from "discord.js";
import { defineEvent } from "../discord/event.ts";
import { logger } from "../shared/utils/logger.ts";

const log = logger.child("gateway");

export default defineEvent({
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    log.info(`Logged in as ${client.user.tag} — serving ${client.guilds.cache.size} guild(s)`);
  },
});
