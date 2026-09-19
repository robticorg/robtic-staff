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
} as const;
