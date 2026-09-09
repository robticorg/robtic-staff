import type { Client } from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachPunishmentClient(next: Client): void {
  client = next;
}

export function getPunishmentClient(): Client | null {
  return client;
}

export function requirePunishmentClient(): Client {
  if (!client) throw new DomainError("PUNISHMENT_NOT_READY", "Punishment client is not attached yet");
  return client;
}
