import { describe, expect, it } from "bun:test";
import {
  LadderProblem,
  orderLadderRoles,
  sameLadder,
  type LadderRoleLike,
} from "../utils/ladder-order.ts";

const EVERYONE = "guild";

const roles: LadderRoleLike[] = [
  { id: EVERYONE, position: 0 },
  { id: "below", position: 1 },
  { id: "start", position: 2 },
  { id: "mid-a", position: 3 },
  { id: "mid-b", position: 4 },
  { id: "end", position: 5 },
  { id: "above", position: 6 },
];

const base = { roles, startRoleId: "start", endRoleId: "end", everyoneRoleId: EVERYONE };

describe("orderLadderRoles", () => {
  it("takes every role between START and END, ascending", () => {
    expect(orderLadderRoles(base)).toEqual({
      ok: true,
      ordered: ["start", "mid-a", "mid-b", "end"],
    });
  });

  it("ignores roles outside the band and @everyone", () => {
    const result = orderLadderRoles(base);
    expect(result.ok && result.ordered).not.toContain("below");
    expect(result.ok && result.ordered).not.toContain("above");
    expect(result.ok && result.ordered).not.toContain(EVERYONE);
  });

  it("picks up a role created inside the band", () => {
    const withNew = [...roles, { id: "fresh", position: 3.5 }];
    expect(orderLadderRoles({ ...base, roles: withNew })).toEqual({
      ok: true,
      ordered: ["start", "mid-a", "fresh", "mid-b", "end"],
    });
  });

  it("follows a reorder — a role dragged into the band joins it", () => {
    const moved = roles.map((r) => (r.id === "above" ? { ...r, position: 3.5 } : r));
    expect(orderLadderRoles({ ...base, roles: moved })).toEqual({
      ok: true,
      ordered: ["start", "mid-a", "above", "mid-b", "end"],
    });
  });

  it("drops a role dragged out of the band", () => {
    const moved = roles.map((r) => (r.id === "mid-a" ? { ...r, position: 9 } : r));
    expect(orderLadderRoles({ ...base, roles: moved })).toEqual({
      ok: true,
      ordered: ["start", "mid-b", "end"],
    });
  });

  it("skips excluded and integration-managed roles inside the band", () => {
    const withManaged = [...roles, { id: "bot-role", position: 3.2, managed: true }];
    expect(
      orderLadderRoles({ ...base, roles: withManaged, excludedRoleIds: ["mid-a"] }),
    ).toEqual({ ok: true, ordered: ["start", "mid-b", "end"] });
  });

  it("never drops START or END even when they are also excluded", () => {
    expect(orderLadderRoles({ ...base, excludedRoleIds: ["start", "end"] })).toEqual({
      ok: true,
      ordered: ["start", "mid-a", "mid-b", "end"],
    });
  });

  it("collapses to a single rung when START and END are the same role", () => {
    expect(orderLadderRoles({ ...base, endRoleId: "start" })).toEqual({
      ok: true,
      ordered: ["start"],
    });
  });

  it("reports a missing or inverted band instead of guessing", () => {
    expect(orderLadderRoles({ ...base, startRoleId: "gone" })).toEqual({
      ok: false,
      problem: LadderProblem.START_MISSING,
    });
    expect(orderLadderRoles({ ...base, endRoleId: "gone" })).toEqual({
      ok: false,
      problem: LadderProblem.END_MISSING,
    });
    expect(orderLadderRoles({ ...base, startRoleId: "end", endRoleId: "start" })).toEqual({
      ok: false,
      problem: LadderProblem.END_BELOW_START,
    });
  });
});

describe("sameLadder", () => {
  it("is order-sensitive", () => {
    expect(sameLadder(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameLadder(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameLadder(["a"], ["a", "b"])).toBe(false);
  });
});
