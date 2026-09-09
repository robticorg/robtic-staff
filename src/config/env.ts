import { isValidTimezone } from "../shared/utils/time.ts";
import { ConfigurationError } from "../libs/errors/index.ts";

export type AppEnv = "development" | "test" | "production";

function readEnvName(): AppEnv {
  const value = process.env.NODE_ENV;
  if (value === "production" || value === "test") return value;
  return "development";
}

function readTimezone(): string {
  const tz = process.env.STAFF_TIMEZONE ?? process.env.TZ ?? "UTC";
  if (!isValidTimezone(tz)) {
    throw new ConfigurationError(
      `STAFF_TIMEZONE "${tz}" is not a valid IANA timezone (e.g. "UTC", "Europe/Paris").`,
    );
  }
  return tz;
}

export interface RawEnv {
  envName: AppEnv;
  timezone: string;
  logLevel: string;

  mongoUri: string;
  mongoDbName: string;

  discordToken?: string;
  discordAppId?: string;
  discordDevGuildId?: string;
  discordGuildId?: string;

  prefix: string;
  fastAccessPrefix: string;
  modmailCasePrefix: string;
}

export const rawEnv: RawEnv = {
  envName: readEnvName(),
  timezone: readTimezone(),
  logLevel: process.env.LOG_LEVEL ?? "info",

  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017",
  mongoDbName: process.env.MONGODB_DB ?? "robtic_staff",

  discordToken: process.env.DISCORD_TOKEN,
  discordAppId: process.env.DISCORD_APP_ID,
  discordDevGuildId: process.env.DISCORD_DEV_GUILD_ID,
  discordGuildId: process.env.DISCORD_GUILD_ID,

  prefix: process.env.PREFIX ?? "!",
  fastAccessPrefix: process.env.FAST_ACCESS_PREFIX ?? "$",
  modmailCasePrefix: process.env.MODMAIL_CASE_PREFIX ?? "RPT-",
};

export function assertRuntimeEnv(): void {
  if (!rawEnv.discordToken) return;
  if (!rawEnv.discordAppId) {
    throw new ConfigurationError(
      "DISCORD_APP_ID is required when DISCORD_TOKEN is set (needed to register commands).",
    );
  }
  if (rawEnv.prefix === rawEnv.fastAccessPrefix) {
    throw new ConfigurationError("PREFIX and FAST_ACCESS_PREFIX must be different.");
  }
}
