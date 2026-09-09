import { config } from "./config/index.ts";
import { bootstrap } from "./bootstrap.ts";
import { createClient } from "./discord/client.ts";
import { disconnectDatabase } from "./database/connect.ts";
import {
  attachModuleClients,
  startModuleRuntime,
  stopModuleRuntime,
} from "./discord/register-runtime.ts";
import { registerClientErrorHandlers } from "./handlers/index.ts";
import { registerApplicationCommands } from "./discord/register-commands.ts";
import { logger } from "./libs/logger/index.ts";

const log = logger.child("main");

async function main(): Promise<void> {
  await bootstrap();

  if (!config.discordToken) {
    log.warn("DISCORD_TOKEN is not set — data layer is ready, gateway client not started.");
    return;
  }

  const client = createClient();
  registerClientErrorHandlers(client);
  attachModuleClients(client);
  await client.login(config.discordToken);

  if (process.env.SKIP_COMMAND_REGISTRATION !== "true") {
    await registerApplicationCommands().catch((err) =>
      log.error("slash command registration failed", err),
    );
  }

  startModuleRuntime();

  const shutdown = async (signal: string): Promise<void> => {
    log.info(`received ${signal}, shutting down`);
    stopModuleRuntime();
    await client.destroy();
    await disconnectDatabase();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error("fatal startup error", err);
  process.exitCode = 1;
});
