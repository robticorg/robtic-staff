import { assertRuntimeEnv, config } from "./config/index.ts";
import { connectDatabase } from "./database/connect.ts";
import { syncAllIndexes } from "./database/models.ts";
import { registerProcessErrorHandlers } from "./handlers/index.ts";
import { logger } from "./libs/logger/index.ts";

const log = logger.child("bootstrap");

export interface BootstrapOptions {
  syncIndexes?: boolean;
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<void> {
  registerProcessErrorHandlers();
  assertRuntimeEnv();
  log.info(`starting (env=${config.env}, tz=${config.timezone})`);
  await connectDatabase();
  if (options.syncIndexes !== false) {
    await syncAllIndexes();
  }
  log.info("data layer ready");
}
