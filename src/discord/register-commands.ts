import { REST, Routes } from "discord.js";
import { config } from "../config/index.ts";
import { commands } from "../commands/index.ts";
import { logger } from "../shared/utils/logger.ts";
import { arabicToEnglish } from "../shared/utils/lang-context.ts";

const log = logger.child("register");

/**
 * Slash commands are built in Arabic (the default language when the bot loads). Discord shows each person a command's
 * text in their own app language, so each description and choice name goes up in English with the Arabic as its `ar`
 * localization. Text with no English pair is left as it is.
 */
export function localizeCommand(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(localizeCommand);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) out[key] = localizeCommand(value);
  for (const field of ["description", "name"] as const) {
    const text = out[field];
    const english = typeof text === "string" ? arabicToEnglish.get(text) : undefined;
    // Command and option names are identifiers, not text: only choices' names (they carry a value) are localized.
    if (!english || (field === "name" && !("value" in out))) continue;
    out[field] = english.slice(0, 100);
    out[`${field}_localizations`] = { ...(out[`${field}_localizations`] as object | undefined), ar: text };
  }
  return out;
}

export async function registerApplicationCommands(): Promise<void> {
  if (!config.discordToken) throw new Error("DISCORD_TOKEN is required to register commands");
  if (!config.discordAppId) throw new Error("DISCORD_APP_ID is required to register commands");

  const body = commands.map((command) => localizeCommand(command.data.toJSON()));
  const rest = new REST({ version: "10" }).setToken(config.discordToken);

  const devGuildId = process.env.DISCORD_DEV_GUILD_ID;
  const route = devGuildId
    ? Routes.applicationGuildCommands(config.discordAppId, devGuildId)
    : Routes.applicationCommands(config.discordAppId);

  log.info(
    `registering ${body.length} command(s) ${devGuildId ? `to guild ${devGuildId}` : "globally"}`,
  );
  await rest.put(route, { body });
  log.info("done");
}

if (import.meta.main) {
  registerApplicationCommands().catch((err) => {
    log.error("registration failed", err);
    process.exitCode = 1;
  });
}
