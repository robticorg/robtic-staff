import { config } from "../../../config/index.ts";
import { periodStart } from "../../../shared/utils/time.ts";
import { STATS_PERIOD_LABEL, StatsPeriod, pointsPeriodFor } from "../types/enums.ts";

export interface StatsRange {
  start: Date | null;
  end: Date;
  label: string;
}

export function resolveStatsRange(
  period: StatsPeriod,
  now: Date = new Date(),
  zone: string = config.timezone,
): StatsRange {
  const start = period === StatsPeriod.ALL_TIME ? null : periodStart(pointsPeriodFor(period), { zone, now });
  return { start, end: now, label: STATS_PERIOD_LABEL[period] };
}

export function rangeFilter(range: StatsRange, field = "createdAt"): Record<string, unknown> {
  if (!range.start) return {};
  return { [field]: { $gte: range.start, $lt: range.end } };
}
