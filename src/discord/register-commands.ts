import { REST, Routes } from "discord.js";
import { config } from "../config/index.ts";
import { commands } from "../commands/index.ts";
import { logger } from "../shared/utils/logger.ts";

const log = logger.child("register");

export async function registerApplicationCommands(): Promise<void> {
  if (!config.discordToken) throw new Error("DISCORD_TOKEN is required to register commands");
  if (!config.discordAppId) throw new Error("DISCORD_APP_ID is required to register commands");

  const body = commands.map((command) => command.data.toJSON());
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
