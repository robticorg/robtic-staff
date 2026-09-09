import { describe, expect, it } from "bun:test";
import { DateTime } from "luxon";
import { StatsPeriod, parseStatsPeriod, pointsPeriodFor } from "../types/enums.ts";
import { rangeFilter, resolveStatsRange } from "../utils/date-range.ts";

const UTC = "UTC";
const NOW = new Date("2026-03-11T14:30:00.000Z");

describe("resolveStatsRange (§3)", () => {
  it("TODAY starts at 00:00 of the current day in the given zone", () => {
    const r = resolveStatsRange(StatsPeriod.TODAY, NOW, UTC);
    expect(r.start?.toISOString()).toBe("2026-03-11T00:00:00.000Z");
    expect(r.end).toEqual(NOW);
  });

  it("THIS_WEEK starts Monday 00:00 (week starts on Monday)", () => {
    const r = resolveStatsRange(StatsPeriod.THIS_WEEK, NOW, UTC);
    expect(r.start?.toISOString()).toBe("2026-03-09T00:00:00.000Z");
    expect(DateTime.fromJSDate(r.start!, { zone: UTC }).weekday).toBe(1);
  });

  it("THIS_MONTH starts on the 1st at 00:00", () => {
    const r = resolveStatsRange(StatsPeriod.THIS_MONTH, NOW, UTC);
    expect(r.start?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("ALL_TIME has no lower bound", () => {
    const r = resolveStatsRange(StatsPeriod.ALL_TIME, NOW, UTC);
    expect(r.start).toBeNull();
    expect(rangeFilter(r)).toEqual({});
  });

  it("respects a non-UTC timezone (month boundary shifts)", () => {
    const feb = new Date("2026-03-01T00:30:00.000Z");
    const utc = resolveStatsRange(StatsPeriod.THIS_MONTH, feb, "UTC");
    const la = resolveStatsRange(StatsPeriod.THIS_MONTH, feb, "America/Los_Angeles");
    expect(utc.start?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(la.start?.toISOString()).toBe("2026-02-01T08:00:00.000Z");
  });

  it("rangeFilter produces a half-open createdAt window on a custom field", () => {
    const r = resolveStatsRange(StatsPeriod.TODAY, NOW, UTC);
    expect(rangeFilter(r, "claimedAt")).toEqual({
      claimedAt: { $gte: r.start, $lt: r.end },
    });
  });
});

describe("period parsing", () => {
  it("maps synonyms to the four periods", () => {
    expect(parseStatsPeriod("daily")).toBe(StatsPeriod.TODAY);
    expect(parseStatsPeriod("today")).toBe(StatsPeriod.TODAY);
    expect(parseStatsPeriod("weekly")).toBe(StatsPeriod.THIS_WEEK);
    expect(parseStatsPeriod("monthly")).toBe(StatsPeriod.THIS_MONTH);
    expect(parseStatsPeriod("all")).toBe(StatsPeriod.ALL_TIME);
    expect(parseStatsPeriod("total")).toBe(StatsPeriod.ALL_TIME);
  });
  it("defaults unknown / missing to THIS_WEEK", () => {
    expect(parseStatsPeriod(undefined)).toBe(StatsPeriod.THIS_WEEK);
    expect(parseStatsPeriod("garbage")).toBe(StatsPeriod.THIS_WEEK);
  });
  it("maps to the shared PointsPeriod", () => {
    expect(pointsPeriodFor(StatsPeriod.TODAY)).toBe("day");
    expect(pointsPeriodFor(StatsPeriod.ALL_TIME)).toBe("all");
  });
});
