import type { ClientEvents } from "discord.js";

export interface EventModule<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => unknown;
}

export function defineEvent<K extends keyof ClientEvents>(event: EventModule<K>): EventModule<K> {
  return event;
}
