import { rawEnv } from "./env.ts";

export interface GiftDeliveryRuntimeConfig {
  autoclaimApiUrl?: string;
  autoclaimApiToken?: string;
  autoclaimTimeoutMs: number;
  giftLinkSecret?: string;
}

export const giftDeliveryRuntimeConfig: GiftDeliveryRuntimeConfig = {
  autoclaimApiUrl: rawEnv.autoclaimApiUrl,
  autoclaimApiToken: rawEnv.autoclaimApiToken,
  autoclaimTimeoutMs: rawEnv.autoclaimTimeoutMs,
  giftLinkSecret: rawEnv.giftLinkSecret,
};
