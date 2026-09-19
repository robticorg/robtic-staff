import { describe, expect, it } from "bun:test";
import { DateTime } from "luxon";
import { config } from "../../../config/index.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { assertPositiveInteger } from "../../configuration/services/staff-config.service.ts";
import { buildCheckCards } from "../render/check-card.ts";
import {
  StaffPromotionPointsService,
  belowLevelFilter,
  type CheckEntry,
} from "../services/staff-promotion-points.service.ts";

const service = new StaffPromotionPointsService();
const NOW = new Date("2026-03-11T14:30:00.000Z");

describe("getCurrentWeekRange", () => {
  it("starts on Monday at 00:00 in the configured timezone", () => {
    const range = service.getCurrentWeekRange(NOW);
    const start = DateTime.fromJSDate(range.start, { zone: config.timezone });

    expect(start.weekday).toBe(1);
    expect(start.hour).toBe(0);
    expect(start.minute).toBe(0);
    expect(start.second).toBe(0);
    expect(start.millisecond).toBe(0);
  });

  it("ends at the current moment, not at the end of the week", () => {
    expect(service.getCurrentWeekRange(NOW).end).toEqual(NOW);
  });

  it("never reaches back further than seven days", () => {
    const range = service.getCurrentWeekRange(NOW);
    const days = (NOW.getTime() - range.start.getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(0);
    expect(days).toBeLessThan(7);
  });

  it("keeps a Monday morning inside its own week", () => {
    const monday = new Date("2026-03-09T00:30:00.000Z");
    const range = service.getCurrentWeekRange(monday);
    expect(range.start.getTime()).toBeLessThanOrEqual(monday.getTime());
  });
});

describe("evaluateEligibility", () => {
  it("is eligible at or above the requirement", () => {
    expect(service.evaluateEligibility(15, 10)).toBe(true);
    expect(service.evaluateEligibility(10, 10)).toBe(true);
  });

  it("is not eligible below the requirement", () => {
    expect(service.evaluateEligibility(7, 10)).toBe(false);
  });

  it("handles a negative weekly net (penalties outweighed the earnings)", () => {
    expect(service.evaluateEligibility(-2, 1)).toBe(false);
  });
});

describe("belowLevelFilter (owner tier and up are out of scope)", () => {
  it("keeps only the rungs under the OWNER boundary", () => {
    expect(belowLevelFilter(5)).toEqual({ currentRoleLevel: { $lt: 5 } });
  });

  it("lists everyone when no OWNER boundary is configured", () => {
    expect(belowLevelFilter(null)).toEqual({});
  });

  it("excludes the owner rung itself, not just the ones above it", () => {
    const { currentRoleLevel } = belowLevelFilter(5) as { currentRoleLevel: { $lt: number } };
    const included = [0, 1, 4, 5, 6, 9].filter((level) => level < currentRoleLevel.$lt);
    expect(included).toEqual([0, 1, 4]);
  });

  it("reports on nobody when the ladder starts at the owner boundary", () => {
    const { currentRoleLevel } = belowLevelFilter(0) as { currentRoleLevel: { $lt: number } };
    expect([0, 1, 2].filter((level) => level < currentRoleLevel.$lt)).toEqual([]);
  });
});

describe("promotion points validation", () => {
  it("accepts positive integers", () => {
    expect(() => assertPositiveInteger(1)).not.toThrow();
    expect(() => assertPositiveInteger(10)).not.toThrow();
  });

  it("rejects zero, negatives, decimals and non-finite values", () => {
    for (const bad of [0, -1, -10, 1.5, 0.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertPositiveInteger(bad)).toThrow(DomainError);
    }
  });
});

describe("buildCheckCards", () => {
  const entry = (
    displayName: string,
    weeklyPoints: number,
    eligible: boolean,
    userId = "123456789012345678",
  ): CheckEntry => ({
    displayName,
    userId,
    weeklyPoints,
    eligible,
    decision: eligible ? "مؤهل للترقية" : "غير مؤهل للترقية",
  });

  it("renders one block per staff member with name, points and decision", () => {
    const [card] = buildCheckCards(10, [entry("RoBo", 15, true), entry("Ahmed", 7, false)]);
    const json = JSON.stringify(card);

    expect(json).toContain("RoBo");
    expect(json).toContain("Ahmed");
    expect(json).toContain("مؤهل للترقية");
    expect(json).toContain("غير مؤهل للترقية");
  });

  it("mentions each staff member alongside their name", () => {
    const [card] = buildCheckCards(10, [
      entry("RoBo", 15, true, "111111111111111111"),
      entry("Ahmed", 7, false, "222222222222222222"),
    ]);
    const json = JSON.stringify(card);

    expect(json).toContain("<@111111111111111111>");
    expect(json).toContain("<@222222222222222222>");
  });

  it("leaves mentions unpingable by not overriding allowedMentions", () => {
    const [card] = buildCheckCards(10, [entry("RoBo", 15, true)]);
    expect(card).not.toHaveProperty("allowedMentions");
  });

  it("never leaks a database identifier", () => {
    const [card] = buildCheckCards(10, [entry("RoBo", 15, true)]);
    const json = JSON.stringify(card);

    expect(json).not.toContain("staffId");
    expect(json).not.toContain("_id");
  });

  it("splits a large roster across messages instead of blowing the component cap", () => {
    const entries = Array.from({ length: 31 }, (_, i) => entry(`staff-${i}`, i, i >= 10));
    const cards = buildCheckCards(10, entries);

    expect(cards.length).toBe(3);
    for (const card of cards) {
      expect(countComponents(card)).toBeLessThanOrEqual(40);
    }
  });

  it("returns nothing when there is nobody to report on", () => {
    expect(buildCheckCards(10, [])).toEqual([]);
  });
});

function countComponents(card: { components?: readonly unknown[] }): number {
  const walk = (nodes: readonly unknown[]): number =>
    nodes.reduce<number>((total, node) => {
      const json = (node as { toJSON?: () => unknown }).toJSON?.() ?? node;
      const children = (json as { components?: unknown[] }).components ?? [];
      return total + 1 + walk(children);
    }, 0);
  return walk(card.components ?? []);
}
