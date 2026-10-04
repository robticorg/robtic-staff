const ENDS_TIMESTAMP = /ends?\s*:?\**\s*<t:(\d{9,12})(?::[tTdDfFR])?>/i;
const USER_MENTION = /<@!?(\d{17,20})>/g;

export interface EmbedLike {
  description?: string | null;
  title?: string | null;
  timestamp?: string | null;
  fields?: readonly { name: string; value: string }[];
}

export function parseEndsAt(embeds: readonly EmbedLike[]): Date | null {
  for (const embed of embeds) {
    const texts = [
      embed.description ?? "",
      ...(embed.fields ?? []).map((field) => `${field.name}: ${field.value}`),
    ];
    for (const text of texts) {
      const match = ENDS_TIMESTAMP.exec(text);
      if (match) return new Date(Number(match[1]) * 1000);
    }
  }
  for (const embed of embeds) {
    if (!embed.timestamp) continue;
    const at = new Date(embed.timestamp);
    if (!Number.isNaN(at.getTime())) return at;
  }
  return null;
}

export function mentionedUserIds(texts: readonly string[], exclude: ReadonlySet<string> = new Set()): string[] {
  const ids = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(USER_MENTION)) {
      if (!exclude.has(match[1]!)) ids.add(match[1]!);
    }
  }
  return [...ids];
}

export interface WinnerMessageFacts {
  authorId: string;
  channelId: string;
  messageId: string;
  referencedMessageId: string | null;
  texts: readonly string[];
  at: Date;
}

export interface GiveawayLike {
  channelId: string;
  messageId: string;
  botId: string;
  endsAt: Date;
}

export function isWinnerMessageFor(
  facts: WinnerMessageFacts,
  giveaway: GiveawayLike,
  options: { earlyToleranceMs: number; windowMs: number },
): boolean {
  if (facts.authorId !== giveaway.botId || facts.channelId !== giveaway.channelId) return false;
  if (facts.messageId === giveaway.messageId) return false;
  const opensAt = giveaway.endsAt.getTime() - options.earlyToleranceMs;
  const closesAt = giveaway.endsAt.getTime() + options.windowMs;
  if (facts.at.getTime() < opensAt || facts.at.getTime() > closesAt) return false;
  if (facts.referencedMessageId) return facts.referencedMessageId === giveaway.messageId;
  return true;
}
