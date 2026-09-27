import { giftDeliveryRuntimeConfig, type GiftDeliveryRuntimeConfig } from "../../../../config/gift-delivery.ts";

export interface StartTransferOptions {
  userId: string;
  guildId: string;
  channelId: string;
  amount: string;
  sendMessage: (content: string) => Promise<{
    id: string;
  }>;
}

export interface TransferRequestContext {
  idempotencyKey: string;
  announcement: string;
}

export const TransferFailure = {
  DISABLED: "DISABLED",
  UNAVAILABLE: "UNAVAILABLE",
  REJECTED: "REJECTED",
  TIMEOUT: "TIMEOUT",
} as const;
export type TransferFailure = (typeof TransferFailure)[keyof typeof TransferFailure];

export type TransferOutcome =
  | { ok: true; messageId: string }
  | { ok: false; reason: TransferFailure; messageId?: string };

export type StartTransfer = (
  options: StartTransferOptions,
  context: TransferRequestContext,
) => Promise<TransferOutcome>;

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

export function createAutoclaimTransfer(
  config: GiftDeliveryRuntimeConfig = giftDeliveryRuntimeConfig,
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): StartTransfer {
  return async (options, context) => {
    if (!config.autoclaimApiUrl) return { ok: false, reason: TransferFailure.DISABLED };

    const message = await options.sendMessage(context.announcement);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "idempotency-key": context.idempotencyKey,
    };
    if (config.autoclaimApiToken) headers.authorization = `Bearer ${config.autoclaimApiToken}`;

    let response: Response;
    try {
      response = await fetchImpl(new URL("/api/claim", config.autoclaimApiUrl).toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: options.userId,
          guildId: options.guildId,
          channelId: options.channelId,
          amount: options.amount,
          messageId: message.id,
          idempotencyKey: context.idempotencyKey,
        }),
        signal: AbortSignal.timeout(config.autoclaimTimeoutMs),
      });
    } catch (err) {
      return {
        ok: false,
        reason: isTimeout(err) ? TransferFailure.TIMEOUT : TransferFailure.UNAVAILABLE,
        messageId: message.id,
      };
    }

    if (response.ok) return { ok: true, messageId: message.id };
    return {
      ok: false,
      reason: response.status >= 500 ? TransferFailure.UNAVAILABLE : TransferFailure.REJECTED,
      messageId: message.id,
    };
  };
}

export const startAutoclaimTransfer: StartTransfer = createAutoclaimTransfer();
