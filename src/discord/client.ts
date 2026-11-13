import { Client, Events, GatewayIntentBits, Partials, type Guild } from "discord.js";
import { isGuildBlocked, onBlockedChange } from "../remote-config.ts";
import { events } from "../events/index.ts";
import { commandMap } from "./registry.ts";
import { logger } from "../shared/utils/logger.ts";
import { guildIdOf, runWithLang } from "../shared/utils/lang-context.ts";
import { inGuildLang, langOf } from "../modules/configuration/services/guild-lang.ts";
import { discordConfig } from "../config/discord.ts";

const log = logger.child("client");

export { inGuildLang, langOf };

export function createClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,

      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  for (const event of events) {
    // Every event runs in its server's language (dashboard → General → Language), so all text below follows it.
    const listener = async (...args: unknown[]) => {
      const guildId = guildIdOf(args);
      try {
        // A DM (reports by modmail) has no server: it speaks the community server's language.
        const lang = await langOf(guildId ?? discordConfig.primaryGuildId ?? null);
        await runWithLang(lang, () => (event.execute as (...a: unknown[]) => unknown)(...args), guildId);
      } catch (err) {
        log.error(`event "${String(event.name)}" threw`, err);
      }
    };
    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);
  }

  // Servers blocked in the admin console: leave on join, on start, and when the list changes.
  const leave = (guild: Guild) => {
    log.warn(`leaving blocked server ${guild.name} (${guild.id})`);
    void guild.leave().catch((err) => log.error(`could not leave ${guild.id}`, err));
  };
  client.on(Events.GuildCreate, (guild) => { if (isGuildBlocked(guild.id)) leave(guild); });
  client.once(Events.ClientReady, (c) => { for (const g of c.guilds.cache.values()) if (isGuildBlocked(g.id)) leave(g); });
  onBlockedChange((ids) => { for (const id of ids) { const g = client.guilds.cache.get(id); if (g) leave(g); } });

  log.info(`registered ${events.length} event(s), ${commandMap.size} command(s)`);
  return client;
}
