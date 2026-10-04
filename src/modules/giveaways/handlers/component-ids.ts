export const GIVEAWAY_NS = "gaw";

export const GiveawayCustomId = {
  done: (executorId: string, userId: string) => `${GIVEAWAY_NS}:done:${executorId}:${userId}`,
} as const;

export interface ParsedGiveawayId {
  action: string;
  args: string[];
}

export function parseGiveawayCustomId(raw: string): ParsedGiveawayId | null {
  if (!raw.startsWith(`${GIVEAWAY_NS}:`)) return null;
  const [, action, ...args] = raw.split(":");
  return action ? { action, args } : null;
}
