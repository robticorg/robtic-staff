import { Client, GatewayIntentBits, Partials } from "discord.js";
import { events } from "../events/index.ts";
import { commandMap } from "./registry.ts";
import { logger } from "../shared/utils/logger.ts";

const log = logger.child("client");

export function createClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  for (const event of events) {
    const listener = (...args: unknown[]) =>
      Promise.resolve((event.execute as (...a: unknown[]) => unknown)(...args)).catch((err) =>
        log.error(`event "${String(event.name)}" threw`, err),
      );
    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);
  }

  log.info(`registered ${events.length} event(s), ${commandMap.size} command(s)`);
  return client;
}
