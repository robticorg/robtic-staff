import type { PointsPeriod } from "../../../shared/utils/time.ts";

export const StatsPeriod = {
  TODAY: "TODAY",
  THIS_WEEK: "THIS_WEEK",
  THIS_MONTH: "THIS_MONTH",
  ALL_TIME: "ALL_TIME",
} as const;
export type StatsPeriod = (typeof StatsPeriod)[keyof typeof StatsPeriod];
export const STATS_PERIOD_VALUES = Object.values(StatsPeriod);

const PERIOD_TO_POINTS: Record<StatsPeriod, PointsPeriod> = {
  [StatsPeriod.TODAY]: "day",
  [StatsPeriod.THIS_WEEK]: "week",
  [StatsPeriod.THIS_MONTH]: "month",
  [StatsPeriod.ALL_TIME]: "all",
};

export function pointsPeriodFor(period: StatsPeriod): PointsPeriod {
  return PERIOD_TO_POINTS[period];
}

export function parseStatsPeriod(input: string | undefined): StatsPeriod {
  switch ((input ?? "").trim().toLowerCase()) {
    case "d":
    case "day":
    case "daily":
    case "today":
      return StatsPeriod.TODAY;
    case "w":
    case "week":
    case "weekly":
      return StatsPeriod.THIS_WEEK;
    case "m":
    case "month":
    case "monthly":
      return StatsPeriod.THIS_MONTH;
    case "a":
    case "all":
    case "alltime":
    case "all-time":
    case "total":
      return StatsPeriod.ALL_TIME;
    default:
      return StatsPeriod.THIS_WEEK;
  }
}

export const STATS_PERIOD_LABEL: Record<StatsPeriod, string> = {
  [StatsPeriod.TODAY]: "اليوم",
  [StatsPeriod.THIS_WEEK]: "هذا الأسبوع",
  [StatsPeriod.THIS_MONTH]: "هذا الشهر",
  [StatsPeriod.ALL_TIME]: "الكل",
};
