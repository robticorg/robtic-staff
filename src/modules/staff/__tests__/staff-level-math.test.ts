import { describe, expect, it } from "bun:test";
import {
  maxLadderLevel,
  resolveAcceptLevel,
  resolveDemoteLevel,
  resolvePromoteLevel,
  rolesAbove,
  rolesUpTo,
} from "../services/staff-level-math.ts";

const ladder = [
  { roleId: "r0", level: 0 },
  { roleId: "r1", level: 1 },
  { roleId: "r2", level: 2 },
  { roleId: "r3", level: 3 },
];

describe("resolveAcceptLevel", () => {
  it("defaults to 0 and clamps the valid range", () => {
    expect(resolveAcceptLevel(null, ladder)).toBe(0);
    expect(resolveAcceptLevel(0, ladder)).toBe(0);
    expect(resolveAcceptLevel(3, ladder)).toBe(3);
  });
  it("rejects out-of-range levels", () => {
    expect(resolveAcceptLevel(5, ladder)).toBeNull();
    expect(resolveAcceptLevel(-1, ladder)).toBeNull();
  });
});

describe("resolvePromoteLevel", () => {
  it("defaults to +1 and never exceeds the END level", () => {
    expect(resolvePromoteLevel(1, null, ladder)).toBe(2);
    expect(resolvePromoteLevel(2, 5, ladder)).toBe(3);
    expect(resolvePromoteLevel(3, 1, ladder)).toBe(3);
  });
});

describe("resolveDemoteLevel", () => {
  it("defaults to -1 and never goes below 0", () => {
    expect(resolveDemoteLevel(2, null)).toBe(1);
    expect(resolveDemoteLevel(1, 5)).toBe(0);
    expect(resolveDemoteLevel(0, 1)).toBe(0);
  });
});

describe("role selection", () => {
  it("rolesUpTo / rolesAbove split the ladder at the target level", () => {
    expect(rolesUpTo(ladder, 2)).toEqual(["r0", "r1", "r2"]);
    expect(rolesAbove(ladder, 2)).toEqual(["r3"]);
    expect(rolesUpTo(ladder, 0)).toEqual(["r0"]);
    expect(rolesAbove(ladder, 3)).toEqual([]);
  });
  it("maxLadderLevel is the END rung", () => {
    expect(maxLadderLevel(ladder)).toBe(3);
    expect(maxLadderLevel([])).toBe(0);
  });
});
