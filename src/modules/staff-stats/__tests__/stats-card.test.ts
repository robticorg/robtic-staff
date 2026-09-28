import { describe, expect, it } from "bun:test";
import { StatsView, parseStatsCustomId, statsCustomId } from "../handlers/component-ids.ts";
import { WEEKS_PER_PAGE, bucketWeeks, paginateWeeks } from "../services/staff-card.service.ts";

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("bucketWeeks", () => {
  it("covers every week from the start to now, including empty ones", () => {
    // 2026-09-07 is a Monday; now is in the week of 2026-09-28 → 4 weeks.
    const weeks = bucketWeeks(
      [
        { amount: 2, type: "TICKET_CLAIM", createdAt: utc("2026-09-08") },
        { amount: 3, type: "REPORT_CLAIM", createdAt: utc("2026-09-09") },
        { amount: -1, type: "STAFF_WARNING", createdAt: utc("2026-09-23") },
      ],
      utc("2026-09-07"),
      utc("2026-09-28"),
      "UTC",
    );

    expect(weeks.map((w) => w.index)).toEqual([1, 2, 3, 4]);
    expect(weeks.map((w) => w.total)).toEqual([5, 0, -1, 0]);
    expect(weeks[0]!.breakdown).toEqual({ TICKET_CLAIM: 2, REPORT_CLAIM: 3 });
  });

  it("starts at the week of the start date even mid-week", () => {
    const weeks = bucketWeeks([], utc("2026-09-24"), utc("2026-09-28"), "UTC");
    expect(weeks).toHaveLength(2);
    expect(weeks[0]!.start.toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });
});

describe("paginateWeeks", () => {
  const weeks = bucketWeeks([], utc("2026-08-03"), utc("2026-09-28"), "UTC"); // 9 weeks

  it(`shows ${WEEKS_PER_PAGE} weeks per page, oldest first`, () => {
    const first = paginateWeeks(weeks, 1);
    expect(first.pages).toBe(3);
    expect(first.weeks.map((w) => w.index)).toEqual([1, 2, 3]);
    expect(paginateWeeks(weeks, 3).weeks.map((w) => w.index)).toEqual([7, 8, 9]);
  });

  it("clamps out-of-range pages", () => {
    expect(paginateWeeks(weeks, 99).page).toBe(3);
    expect(paginateWeeks(weeks, 0).page).toBe(1);
    expect(paginateWeeks([], 1)).toEqual({ weeks: [], page: 1, pages: 1 });
  });
});

describe("stats custom ids", () => {
  it("round-trips and ignores the prev/next tag", () => {
    const raw = statsCustomId({ view: StatsView.WEEKS, viewerId: "1", targetId: "2", page: 3 });
    expect(parseStatsCustomId(raw)).toEqual({
      view: StatsView.WEEKS,
      viewerId: "1",
      targetId: "2",
      page: 3,
    });
    expect(parseStatsCustomId(`${raw}:n`)?.page).toBe(3);
  });

  it("rejects other namespaces and unknown views", () => {
    expect(parseStatsCustomId("ss:support")).toBeNull();
    expect(parseStatsCustomId("sst:nope:1:2:1")).toBeNull();
  });
});
