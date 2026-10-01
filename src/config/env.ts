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

  internalApiToken?: string;
  internalApiHost: string;
  internalApiPort: number;

  autoclaimApiUrl?: string;
  autoclaimApiToken?: string;
  autoclaimTimeoutMs: number;
  giftLinkSecret?: string;
}

const DEFAULT_AUTOCLAIM_API_URL = "http://192.168.1.146:8790";

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readPort(value: string | undefined, fallback: number): number {
  const port = Number.parseInt(value ?? "", 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
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

  internalApiToken: process.env.INTERNAL_API_TOKEN || undefined,
  internalApiHost: process.env.INTERNAL_API_HOST || "0.0.0.0",
  internalApiPort: readPort(process.env.INTERNAL_API_PORT, 8788),

  autoclaimApiUrl: (process.env.AUTOCLAIM_API_URL ?? DEFAULT_AUTOCLAIM_API_URL) || undefined,
  autoclaimApiToken: process.env.AUTOCLAIM_API_TOKEN || undefined,
  autoclaimTimeoutMs: readPositiveInt(process.env.AUTOCLAIM_TIMEOUT_MS, 15_000),
  giftLinkSecret: process.env.GIFT_LINK_SECRET || undefined,
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
