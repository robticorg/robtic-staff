import type { Client, Guild } from "discord.js";
import { config } from "../../config/index.ts";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachModmailClient(next: Client): void {
  client = next;
}

export function getModmailClient(): Client | null {
  return client;
}

export function requireModmailClient(): Client {
  if (!client) throw new DomainError("MODMAIL_NOT_READY", "Modmail client is not attached yet");
  return client;
}

export function resolvePrimaryGuild(c: Client = requireModmailClient()): Guild {
  if (config.primaryGuildId) {
    const guild = c.guilds.cache.get(config.primaryGuildId);
    if (!guild) {
      throw new DomainError("GUILD_UNAVAILABLE", "Configured primary guild is not available");
    }
    return guild;
  }
  if (c.guilds.cache.size === 1) return c.guilds.cache.first()!;
  throw new DomainError(
    "GUILD_AMBIGUOUS",
    "Bot is in multiple guilds — set DISCORD_GUILD_ID to pick the community guild",
  );
}
