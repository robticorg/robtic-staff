import { describe, expect, it } from "bun:test";
import { DateTime } from "luxon";
import {
  formatDuration,
  parseApplicationDuration,
  parseBreakDuration,
  resolveWindow,
} from "../services/duration.ts";
import { VacationDurationUnit } from "../types/enums.ts";

describe("parseBreakDuration (!break)", () => {
  it("parses each unit — m=minutes, d=days, w=weeks, M=months (case-sensitive)", () => {
    expect(parseBreakDuration("5m")).toEqual({ value: 5, unit: VacationDurationUnit.MINUTES });
    expect(parseBreakDuration("3d")).toEqual({ value: 3, unit: VacationDurationUnit.DAYS });
    expect(parseBreakDuration("7d")).toEqual({ value: 7, unit: VacationDurationUnit.DAYS });
    expect(parseBreakDuration("1w")).toEqual({ value: 1, unit: VacationDurationUnit.WEEKS });
    expect(parseBreakDuration("1M")).toEqual({ value: 1, unit: VacationDurationUnit.MONTHS });
  });

  it("does not confuse lowercase m (minutes) with uppercase M (months)", () => {
    expect(parseBreakDuration("2m")).toEqual({ value: 2, unit: VacationDurationUnit.MINUTES });
    expect(parseBreakDuration("2M")).toEqual({ value: 2, unit: VacationDurationUnit.MONTHS });
  });

  it("rejects junk, bare numbers, unknown units and out-of-range values", () => {
    expect(parseBreakDuration("")).toBeNull();
    expect(parseBreakDuration("7")).toBeNull();
    expect(parseBreakDuration("1h")).toBeNull();
    expect(parseBreakDuration("abc")).toBeNull();
    expect(parseBreakDuration("3 d")).toBeNull();
    expect(parseBreakDuration("0d")).toBeNull();
    expect(parseBreakDuration("999d")).toBeNull();
  });
});

describe("parseApplicationDuration (modal)", () => {
  it("treats a bare number as days", () => {
    expect(parseApplicationDuration("7")).toEqual({ value: 7, unit: VacationDurationUnit.DAYS });
    expect(parseApplicationDuration("24")).toEqual({ value: 24, unit: VacationDurationUnit.DAYS });
  });

  it("treats <n>m as months", () => {
    expect(parseApplicationDuration("1m")).toEqual({ value: 1, unit: VacationDurationUnit.MONTHS });
    expect(parseApplicationDuration("2m")).toEqual({ value: 2, unit: VacationDurationUnit.MONTHS });
  });

  it("rejects the !break-only units and junk", () => {
    expect(parseApplicationDuration("3d")).toBeNull();
    expect(parseApplicationDuration("1w")).toBeNull();
    expect(parseApplicationDuration("1M")).toBeNull();
    expect(parseApplicationDuration("")).toBeNull();
    expect(parseApplicationDuration("0")).toBeNull();
  });
});

describe("resolveWindow", () => {
  it("adds calendar months for MONTHS (not a fixed 30 days)", () => {
    const from = new Date("2026-01-31T12:00:00.000Z");
    const { endsAt } = resolveWindow(from, { value: 1, unit: VacationDurationUnit.MONTHS });
    const expected = DateTime.fromJSDate(from).plus({ months: 1 }).toJSDate();
    expect(endsAt.getTime()).toBe(expected.getTime());
    expect(endsAt.getUTCMonth()).toBe(1);
  });

  it("adds minutes / days / weeks exactly", () => {
    const from = new Date("2026-03-01T00:00:00.000Z");
    expect(
      resolveWindow(from, { value: 5, unit: VacationDurationUnit.MINUTES }).endsAt.getTime(),
    ).toBe(from.getTime() + 5 * 60_000);
    expect(
      resolveWindow(from, { value: 2, unit: VacationDurationUnit.WEEKS }).endsAt.getTime(),
    ).toBe(from.getTime() + 14 * 86_400_000);
  });
});

describe("formatDuration", () => {
  it("pluralises", () => {
    expect(formatDuration({ value: 1, unit: VacationDurationUnit.DAYS })).toBe("1 day");
    expect(formatDuration({ value: 7, unit: VacationDurationUnit.DAYS })).toBe("7 days");
    expect(formatDuration({ value: 1, unit: VacationDurationUnit.MONTHS })).toBe("1 month");
  });
});
