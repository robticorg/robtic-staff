const MINUTE_MS = 60_000;

export const giveawayConfig = {
  resultWindowMs: 24 * 60 * MINUTE_MS,
  earlyEndToleranceMs: 2 * MINUTE_MS,
} as const;
