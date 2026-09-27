import { rawEnv } from "./env.ts";

export interface InternalApiConfig {
  token?: string;
  host: string;
  port: number;
}

export const internalApiConfig: InternalApiConfig = {
  token: rawEnv.internalApiToken,
  host: rawEnv.internalApiHost,
  port: rawEnv.internalApiPort,
};
