import type { Client } from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachGiftClaimClient(next: Client): void {
  client = next;
}

export function getGiftClaimClient(): Client | null {
  return client;
}

export function requireGiftClaimClient(): Client {
  if (!client) throw new DomainError("GIFT_CLAIM_NOT_READY", "Gift claim client is not attached yet");
  return client;
}
