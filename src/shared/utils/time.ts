import { DateTime, IANAZone } from "luxon";

export type PointsPeriod = "day" | "week" | "month" | "all";

export const POINTS_PERIODS: readonly PointsPeriod[] = ["day", "week", "month", "all"];

export const WEEK_STARTS_ON = 1 as const;

export function isValidTimezone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

export interface PeriodBoundsOptions {
  zone: string;

  now?: Date;
}

export function periodStart(period: PointsPeriod, options: PeriodBoundsOptions): Date | null {
  if (period === "all") return null;

  const zone = options.zone;
  if (!isValidTimezone(zone)) {
    throw new Error(`Invalid timezone: "${zone}"`);
  }

  const reference = DateTime.fromJSDate(options.now ?? new Date(), { zone });
  const unit = period === "day" ? "day" : period === "week" ? "week" : "month";

  return reference.startOf(unit).toJSDate();
}

export function periodRange(
  period: PointsPeriod,
  options: PeriodBoundsOptions,
): { start: Date | null; end: Date } {
  const start = periodStart(period, options);
  if (period === "all" || start === null) {
    return { start: null, end: options.now ?? new Date() };
  }

  const zone = options.zone;
  const reference = DateTime.fromJSDate(options.now ?? new Date(), { zone });
  const unit = period === "day" ? "day" : period === "week" ? "week" : "month";
  const end = reference.startOf(unit).plus({ [`${unit}s`]: 1 }).toJSDate();
  return { start, end };
}
