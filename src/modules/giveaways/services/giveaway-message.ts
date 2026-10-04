import type { Guild, Message } from "discord.js";

const LINK = /channels\/(\d{17,20}|@me)\/(\d{17,20})\/(\d{17,20})/;
const SNOWFLAKE = /^\d{17,20}$/;

export interface GiveawayMessageRef {
  channelId: string | null;
  messageId: string;
}

export function parseMessageRef(raw: string | null | undefined): GiveawayMessageRef | null {
  const value = raw?.trim().replace(/^<|>$/g, "") ?? "";
  const link = LINK.exec(value);
  if (link) return { channelId: link[2]!, messageId: link[3]! };
  const parts = value.split(/[-/]/).filter(Boolean);
  if (parts.length === 2 && parts.every((part) => SNOWFLAKE.test(part))) {
    return { channelId: parts[0]!, messageId: parts[1]! };
  }
  return SNOWFLAKE.test(value) ? { channelId: null, messageId: value } : null;
}

function collectStrings(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out);
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if ((key === "content" || key === "label" || key === "value") && typeof value === "string") out.push(value);
    else if (typeof value === "object") collectStrings(value, out);
  }
}

export interface MessageLike {
  content: string;
  embeds: readonly {
    title?: string | null;
    description?: string | null;
    fields?: readonly { name: string; value: string }[];
    footer?: { text: string } | null;
    author?: { name: string } | null;
  }[];
  components?: readonly unknown[];
}

export function messageTexts(message: MessageLike): string[] {
  const texts: string[] = [message.content];
  for (const embed of message.embeds) {
    texts.push(
      embed.title ?? "",
      embed.description ?? "",
      embed.footer?.text ?? "",
      embed.author?.name ?? "",
      ...(embed.fields ?? []).map((field) => `${field.name}: ${field.value}`),
    );
  }
  const fromComponents: string[] = [];
  for (const component of message.components ?? []) {
    const json =
      component && typeof component === "object" && "toJSON" in component
        ? (component as { toJSON(): unknown }).toJSON()
        : component;
    collectStrings(json, fromComponents);
  }
  texts.push(...fromComponents);
  return texts.filter((text) => text.trim().length > 0);
}

export async function findGiveawayMessage(
  guild: Guild,
  ref: GiveawayMessageRef,
  currentChannelId: string,
): Promise<Message | null> {
  const tryChannel = async (channelId: string): Promise<Message | null> => {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !("messages" in channel)) return null;
    return channel.messages.fetch(ref.messageId).catch(() => null);
  };

  if (ref.channelId) return tryChannel(ref.channelId);

  const tried = new Set<string>([currentChannelId]);
  const inCurrent = await tryChannel(currentChannelId);
  if (inCurrent) return inCurrent;

  const channels = await guild.channels.fetch().catch(() => null);
  const threads = await guild.channels.fetchActiveThreads().catch(() => null);
  const candidates = [...(channels?.values() ?? []), ...(threads?.threads.values() ?? [])];
  for (const channel of candidates) {
    if (!channel || tried.has(channel.id) || !channel.isTextBased() || !("messages" in channel)) continue;
    tried.add(channel.id);
    const found = await channel.messages.fetch(ref.messageId).catch(() => null);
    if (found) return found;
  }
  return null;
}
