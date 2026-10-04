const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const claimReleaseConfig = {
  checkDelayMs: 15 * MINUTE_MS,
  tagGraceMs: 3 * DAY_MS,
  sweepIntervalMs: MINUTE_MS,
  sweepBatchSize: 25,
} as const;
