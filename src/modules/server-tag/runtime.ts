import type { Client } from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachServerTagClient(next: Client): void {
  client = next;
}

export function getServerTagClient(): Client | null {
  return client;
}

export function requireServerTagClient(): Client {
  if (!client) {
    throw new DomainError("SERVER_TAG_NOT_READY", "Server tag client is not attached yet");
  }
  return client;
}
