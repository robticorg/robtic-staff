import { colors } from "../config/colors.ts";
import { punishmentConfig } from "../config/punishment.ts";

export const WarnPanelAction = {
  TIMEOUT: "TIMEOUT",
  JAIL: "JAIL",
  USER_WARN: "USER_WARN",
  STAFF_WARN: "STAFF_WARN",
} as const;
export type WarnPanelAction = (typeof WarnPanelAction)[keyof typeof WarnPanelAction];
export const WARN_PANEL_ACTION_VALUES = Object.values(WarnPanelAction);

export const warnPanelConfig = {
  panelAccentColor: colors.report,

  /** Reuses the punishment module's evidence cap rather than inventing a second one. */
  maxEvidenceFiles: punishmentConfig.maxEvidenceShown,
  minEvidenceFiles: 1,

  /**
   * How long one manager is blocked from re-submitting the same action against the
   * same target — long enough to absorb a double-click, short enough not to block
   * a genuine second punishment.
   */
  submitLockMs: 10_000,

  /**
   * How often the stored panel message is re-edited so the select menu clears the
   * option the last manager picked. `0` disables the sweeper entirely.
   *
   * The panel is also refreshed immediately after every use, which is what
   * actually clears the menu for the manager who just used it. This sweep is the
   * belt-and-braces pass for anyone whose client still shows a stale selection —
   * it re-edits a message whose content never changes, so it is pure Discord API
   * traffic. See `refreshIntervalMs` in the README before lowering it.
   */
  refreshIntervalMs: 5_000,
} as const;
