import type { Client } from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachTicketClient(next: Client): void {
  client = next;
}

export function getTicketClient(): Client | null {
  return client;
}

export function requireTicketClient(): Client {
  if (!client) throw new DomainError("TICKETS_NOT_READY", "Ticket client is not attached yet");
  return client;
}
