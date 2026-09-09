import type { Client } from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachAppealClient(next: Client): void {
  client = next;
}

export function getAppealClient(): Client | null {
  return client;
}

export function requireAppealClient(): Client {
  if (!client) throw new DomainError("APPEAL_NOT_READY", "Appeal client is not attached yet");
  return client;
}
