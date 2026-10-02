import { Events, type Client, type Message } from "discord.js";
import { giftDeliveryRuntimeConfig } from "../../../../config/gift-delivery.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { requireGiftClaimClient } from "../../runtime.ts";

const log = logger.child("gift-delivery:confirmation");

const TRANSFER_LINE =
  /(?:\*\*(?<sender>[^*]+?)\*\*\s*,?\s*)?has\s+transferred\s+\*{0,2}\s*\$?\s*(?<amount>[\d,\s]+?)\s*\*{0,2}\s+to\s+<@!?(?<receiver>\d+)>/iu;

export interface ExpectedTransfer {
  channelId: string;
  userId: string;
  amount: string;
}

export interface ConfirmationMessage {
  authorId: string;
  channelId: string;
  texts: readonly string[];
}

export interface TransferLine {
  sender: string | null;
  userId: string;
  amount: string;
}

export function parseTransferLine(text: string): TransferLine | null {
  const groups = TRANSFER_LINE.exec(text)?.groups;
  if (!groups?.amount || !groups.receiver) return null;
  const amount = groups.amount.replace(/\D/g, "").replace(/^0+/, "");
  if (!amount) return null;
  const sender = groups.sender?.replace(/\\(.)/g, "$1").trim() || null;
  return { sender, userId: groups.receiver, amount };
}

export function findTransferConfirmation(
  message: ConfirmationMessage,
  expected: ExpectedTransfer,
  botId: string,
): TransferLine | null {
  if (message.authorId !== botId || message.channelId !== expected.channelId) return null;
  for (const text of message.texts) {
    const parsed = parseTransferLine(text);
    if (parsed && parsed.userId === expected.userId && parsed.amount === expected.amount) return parsed;
  }
  return null;
}

export function isTransferConfirmation(
  message: ConfirmationMessage,
  expected: ExpectedTransfer,
  botId: string,
): boolean {
  return findTransferConfirmation(message, expected, botId) !== null;
}

function textsOf(message: Message): string[] {
  return [
    message.content,
    ...message.embeds.flatMap((embed) => [embed.description ?? "", embed.title ?? ""]),
  ].filter(Boolean);
}

export interface PendingConfirmation {
  wait(timeoutMs?: number): Promise<boolean>;
  cancel(): void;
}

export type ExpectConfirmation = (expected: ExpectedTransfer) => PendingConfirmation;

export function createTransferConfirmation(
  clientOf: () => Client = requireGiftClaimClient,
  config: { botId: string; timeoutMs: number } = {
    botId: giftDeliveryRuntimeConfig.autoclaimConfirmBotId,
    timeoutMs: giftDeliveryRuntimeConfig.autoclaimConfirmTimeoutMs,
  },
): ExpectConfirmation {
  return (expected) => {
    const client = clientOf();
    let confirmed = false;
    let settle: ((value: boolean) => void) | null = null;

    const onMessage = (message: Message) => {
      const match = findTransferConfirmation(
        { authorId: message.author.id, channelId: message.channelId, texts: textsOf(message) },
        expected,
        config.botId,
      );
      if (!match) return;
      log.info(`transfer confirmed: ${match.sender ?? "?"} → ${match.userId} (${match.amount}) in ${expected.channelId}`);
      confirmed = true;
      settle?.(true);
    };
    const stop = () => {
      client.off(Events.MessageCreate, onMessage);
    };
    client.on(Events.MessageCreate, onMessage);

    return {
      wait(timeoutMs = config.timeoutMs) {
        if (confirmed) {
          stop();
          return Promise.resolve(true);
        }
        return new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => {
            settle = null;
            stop();
            resolve(false);
          }, timeoutMs);
          settle = (value) => {
            clearTimeout(timer);
            settle = null;
            stop();
            resolve(value);
          };
        });
      },
      cancel: stop,
    };
  };
}

export const expectTransferConfirmation: ExpectConfirmation = (expected) =>
  createTransferConfirmation()(expected);
