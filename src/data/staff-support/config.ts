import { colors } from "../config/colors.ts";

/**
 * Static configuration for the Staff Support workflows. Ids live here and are
 * never written into a service, a handler or a command — exactly like the
 * ticket panel configuration in `src/data/tickets/`.
 */
export const staffSupportConfig = {
  /** Category every Staff Support / Demission ticket channel is created under. */
  staffSupportCategoryId: "1549559127234183299",

  panelAccentColor: colors.primary,

  maxReasonLength: 1500,
} as const;

export type StaffSupportConfig = typeof staffSupportConfig;
