import { appConfig } from "./app.ts";
import { databaseConfig } from "./database.ts";
import { discordConfig } from "./discord.ts";
import { assertRuntimeEnv } from "./env.ts";

export interface AppConfig {
  mongoUri: string;
  mongoDbName?: string;
  discordToken?: string;
  discordAppId?: string;
  primaryGuildId?: string;
  prefix: string;
  fastAccessPrefix: string;
  timezone: string;
  env: "development" | "test" | "production";
}

export const config: AppConfig = {
  mongoUri: databaseConfig.uri,
  mongoDbName: databaseConfig.dbName,
  discordToken: discordConfig.token,
  discordAppId: discordConfig.appId,
  primaryGuildId: discordConfig.primaryGuildId,
  prefix: discordConfig.prefix,
  fastAccessPrefix: discordConfig.fastAccessPrefix,
  timezone: appConfig.timezone,
  env: appConfig.env,
};

export { appConfig, databaseConfig, discordConfig, assertRuntimeEnv };
export { rawEnv, type AppEnv } from "./env.ts";
export type { PointsPeriod } from "../shared/utils/time.ts";
