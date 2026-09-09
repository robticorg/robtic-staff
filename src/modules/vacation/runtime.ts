import type { Client } from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachVacationClient(next: Client): void {
  client = next;
}

export function getVacationClient(): Client | null {
  return client;
}

export function requireVacationClient(): Client {
  if (!client) throw new DomainError("VACATION_NOT_READY", "Vacation client is not attached yet");
  return client;
}
