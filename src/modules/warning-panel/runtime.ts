import type { Client } from "discord.js";
import { DomainError } from "../../shared/utils/errors.ts";

let client: Client | null = null;

export function attachWarningPanelClient(next: Client): void {
  client = next;
}

export function getWarningPanelClient(): Client | null {
  return client;
}

export function requireWarningPanelClient(): Client {
  if (!client) {
    throw new DomainError("WARN_PANEL_NOT_READY", "Warning panel client is not attached yet");
  }
  return client;
}
