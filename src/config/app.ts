import { rawEnv, type AppEnv } from "./env.ts";

export interface AppRuntimeConfig {
  env: AppEnv;
  timezone: string;
  logLevel: string;
}

export const appConfig: AppRuntimeConfig = {
  env: rawEnv.envName,
  timezone: rawEnv.timezone,
  logLevel: rawEnv.logLevel,
};
