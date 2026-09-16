export const configurationConfig = {
  /**
   * Reordering roles in the Discord UI emits one `roleUpdate` per role that
   * shifted position. Waiting this long after the last one collapses the whole
   * drag into a single ladder rebuild instead of one per role.
   */
  ladderSyncDebounceMs: 3_000,
} as const;

export type ConfigurationConfig = typeof configurationConfig;
