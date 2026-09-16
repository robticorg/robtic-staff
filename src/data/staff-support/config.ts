import { colors } from "../config/colors.ts";

export const staffSupportConfig = {
  staffSupportCategoryId: "1549559127234183299",

  panelAccentColor: colors.primary,

  maxReasonLength: 1500,
} as const;

export type StaffSupportConfig = typeof staffSupportConfig;
