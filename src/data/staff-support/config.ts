import { colors } from "../config/colors.ts";

export const staffSupportConfig = {
  panelAccentColor: colors.primary,

  maxReasonLength: 1500,
} as const;

export type StaffSupportConfig = typeof staffSupportConfig;
