import type { Client } from "discord.js";

let client: Client | null = null;

export function attachResponsibilityClient(next: Client): void {
  client = next;
}

export function getResponsibilityClient(): Client | null {
  return client;
}
