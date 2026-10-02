import { rawEnv } from "./env.ts";

export interface GiftDeliveryRuntimeConfig {
  autoclaimApiUrl?: string;
  autoclaimApiToken?: string;
  autoclaimTimeoutMs: number;
  autoclaimConfirmBotId: string;
  autoclaimConfirmTimeoutMs: number;
  giftLinkSecret?: string;
}

export const giftDeliveryRuntimeConfig: GiftDeliveryRuntimeConfig = {
  autoclaimApiUrl: rawEnv.autoclaimApiUrl,
  autoclaimApiToken: rawEnv.autoclaimApiToken,
  autoclaimTimeoutMs: rawEnv.autoclaimTimeoutMs,
  autoclaimConfirmBotId: rawEnv.autoclaimConfirmBotId,
  autoclaimConfirmTimeoutMs: rawEnv.autoclaimConfirmTimeoutMs,
  giftLinkSecret: rawEnv.giftLinkSecret,
};
