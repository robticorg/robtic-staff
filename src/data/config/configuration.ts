export const configurationConfig = {
  ladderSyncDebounceMs: 3_000,
} as const;

export type ConfigurationConfig = typeof configurationConfig;
