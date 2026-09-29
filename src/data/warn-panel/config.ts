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
  maxEvidenceFiles: punishmentConfig.maxEvidenceShown,
  minEvidenceFiles: 1,
  submitLockMs: 10_000,
  refreshIntervalMs: 5_000,
} as const;
