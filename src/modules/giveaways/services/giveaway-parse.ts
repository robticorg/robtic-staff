const ENDS_TIMESTAMP = /(?:ends?|ending|ينتهي|تنتهي|الانتهاء|ينتهى)[^<\n]{0,40}<t:(\d{9,12})(?::[tTdDfFR])?>/iu;
const ANY_TIMESTAMP = /<t:(\d{9,12})(?::[tTdDfFR])?>/g;
const USER_MENTION = /<@!?(\d{17,20})>/g;

export function findEndTime(input: {
  texts: readonly string[];
  embedTimestamps: readonly (string | null | undefined)[];
  now: Date;
}): Date | null {
  for (const text of input.texts) {
    const match = ENDS_TIMESTAMP.exec(text);
    if (match) return new Date(Number(match[1]) * 1000);
  }
  for (const raw of input.embedTimestamps) {
    if (!raw) continue;
    const at = new Date(raw);
    if (!Number.isNaN(at.getTime())) return at;
  }
  let latest: number | null = null;
  for (const text of input.texts) {
    for (const match of text.matchAll(ANY_TIMESTAMP)) {
      const ms = Number(match[1]) * 1000;
      if (ms > input.now.getTime() && (latest === null || ms > latest)) latest = ms;
    }
  }
  return latest === null ? null : new Date(latest);
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
