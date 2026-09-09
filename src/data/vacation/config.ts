import { colors } from "../config/colors.ts";
import { VacationDurationUnit, type VacationDurationUnit as Unit } from "../../modules/vacation/types/enums.ts";

export const VACATION_MAX_BY_UNIT: Record<Unit, number> = {
  [VacationDurationUnit.MINUTES]: 43_200,
  [VacationDurationUnit.DAYS]: 180,
  [VacationDurationUnit.WEEKS]: 26,
  [VacationDurationUnit.MONTHS]: 6,
};

export const vacationConfig = {
  sweepIntervalMs: 60_000,
  absentGraceMs: 14 * 86_400_000,
  sweepBatchSize: 25,
  maxReasonLength: 1500,
  panelAccentColor: colors.primary,
  requestAccentColor: {
    pending: colors.warning,
    approved: colors.success,
    rejected: colors.error,
    active: colors.success,
    cancelled: colors.neutral,
    completed: colors.neutral,
  },
} as const;
