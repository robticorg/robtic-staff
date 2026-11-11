import { DateTime } from "luxon";
import { VACATION_MAX_BY_UNIT } from "../../../data/vacation/config.ts";
import { VacationDurationUnit } from "../types/enums.ts";

export interface VacationDuration {
  value: number;
  unit: VacationDurationUnit;
}

const BREAK_UNIT: Record<string, VacationDurationUnit> = {
  m: VacationDurationUnit.MINUTES,
  d: VacationDurationUnit.DAYS,
  w: VacationDurationUnit.WEEKS,
  M: VacationDurationUnit.MONTHS,
};

const DEFAULT_MAX_DAYS = VACATION_MAX_BY_UNIT[VacationDurationUnit.DAYS];

/**
 * The longest allowed value per unit for a server's longest vacation. With the default (180 days) this gives exactly
 * the old fixed table: 180 days, 26 weeks, 6 months; minutes stay capped at the old 30 days.
 */
function maxFor(unit: VacationDurationUnit, maxDays: number): number {
  if (unit === VacationDurationUnit.DAYS) return maxDays;
  if (unit === VacationDurationUnit.WEEKS) return Math.ceil(maxDays / 7);
  if (unit === VacationDurationUnit.MONTHS) return Math.ceil(maxDays / 30);
  return Math.min(VACATION_MAX_BY_UNIT[VacationDurationUnit.MINUTES], maxDays * 1440);
}

function withinBounds(d: VacationDuration, maxDays: number): boolean {
  if (!Number.isInteger(d.value) || d.value < 1) return false;
  return d.value <= maxFor(d.unit, maxDays);
}

export function parseBreakDuration(input: string, maxDays: number = DEFAULT_MAX_DAYS): VacationDuration | null {
  const trimmed = input.trim();
  const match = /^(\d{1,7})(m|d|w|M)$/.exec(trimmed);
  if (!match) return null;
  const unit = BREAK_UNIT[match[2] as keyof typeof BREAK_UNIT];
  if (!unit) return null;
  const duration = { value: Number(match[1]), unit };
  return withinBounds(duration, maxDays) ? duration : null;
}

export function parseApplicationDuration(input: string, maxDays: number = DEFAULT_MAX_DAYS): VacationDuration | null {
  const trimmed = input.trim();
  const match = /^(\d{1,7})(m)?$/.exec(trimmed);
  if (!match) return null;
  const unit = match[2] ? VacationDurationUnit.MONTHS : VacationDurationUnit.DAYS;
  const duration = { value: Number(match[1]), unit };
  return withinBounds(duration, maxDays) ? duration : null;
}

const LUXON_UNIT: Record<VacationDurationUnit, "minutes" | "days" | "weeks" | "months"> = {
  [VacationDurationUnit.MINUTES]: "minutes",
  [VacationDurationUnit.DAYS]: "days",
  [VacationDurationUnit.WEEKS]: "weeks",
  [VacationDurationUnit.MONTHS]: "months",
};

export function resolveWindow(
  from: Date,
  duration: VacationDuration,
): { startsAt: Date; endsAt: Date } {
  const start = DateTime.fromJSDate(from);
  const end = start.plus({ [LUXON_UNIT[duration.unit]]: duration.value });
  return { startsAt: start.toJSDate(), endsAt: end.toJSDate() };
}

const UNIT_LABEL: Record<VacationDurationUnit, [string, string]> = {
  [VacationDurationUnit.MINUTES]: ["minute", "minutes"],
  [VacationDurationUnit.DAYS]: ["day", "days"],
  [VacationDurationUnit.WEEKS]: ["week", "weeks"],
  [VacationDurationUnit.MONTHS]: ["month", "months"],
};

export function formatDuration(duration: VacationDuration): string {
  const [singular, plural] = UNIT_LABEL[duration.unit];
  return `${duration.value} ${duration.value === 1 ? singular : plural}`;
}

export const vacationDurationService = {
  parseBreak: parseBreakDuration,
  parseApplication: parseApplicationDuration,
  resolveWindow,
  format: formatDuration,
};
