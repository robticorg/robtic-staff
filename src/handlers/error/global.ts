import type { Client } from "discord.js";
import { logger } from "../../libs/logger/index.ts";
import { toLogContext } from "../../libs/errors/index.ts";

const log = logger.child("global-errors");

let processHandlersRegistered = false;

export function registerProcessErrorHandlers(): void {
  if (processHandlersRegistered) return;
  processHandlersRegistered = true;

  process.on("unhandledRejection", (reason) => {
    log.error("unhandledRejection", toLogContext(reason));
  });

  process.on("uncaughtExceptionMonitor", (err, origin) => {
    log.error(`uncaughtException (${origin})`, toLogContext(err));
  });

  process.on("warning", (warning) => {
    log.warn(`process warning: ${warning.name}`, { message: warning.message });
  });
}

export function registerClientErrorHandlers(client: Client): void {
  client.on("error", (err) => {
    log.error("discord client error", toLogContext(err));
  });

  client.on("warn", (message) => {
    log.warn("discord client warning", { message });
  });

  client.on("shardError", (err, shardId) => {
    log.error(`discord shard ${shardId} error`, toLogContext(err));
  });
}
