import { rawEnv } from "./env.ts";

export interface DiscordConfig {
  token?: string;
  appId?: string;
  primaryGuildId?: string;
  prefix: string;
  fastAccessPrefix: string;
}

export const discordConfig: DiscordConfig = {
  token: rawEnv.discordToken,
  appId: rawEnv.discordAppId,
  primaryGuildId: rawEnv.discordGuildId ?? rawEnv.discordDevGuildId,
  prefix: rawEnv.prefix,
  fastAccessPrefix: rawEnv.fastAccessPrefix,
};
