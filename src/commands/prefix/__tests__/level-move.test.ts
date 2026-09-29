import { describe, expect, it } from "bun:test";
import { StaffTier } from "../../../modules/configuration/types/enums.ts";
import { resolveMove } from "../../../modules/staff/services/staff-level-math.ts";
import { parseMoveArgs } from "../_shared/move-args.ts";

const LADDER = Array.from({ length: 11 }, (_, level) => ({ roleId: `r${level}`, level }));

describe("resolveMove", () => {
  it("steps up and down as before", () => {
    expect(resolveMove("promote", 3, null, LADDER)).toEqual({ to: 4, wrongWay: false });
    expect(resolveMove("promote", 3, 2, LADDER)).toEqual({ to: 5, wrongWay: false });
    expect(resolveMove("promote", 9, 5, LADDER)).toEqual({ to: 10, wrongWay: false });
    expect(resolveMove("demote", 3, 2, LADDER)).toEqual({ to: 1, wrongWay: false });
  });

  it("moves straight to a tier's level", () => {
    expect(resolveMove("promote", 2, { level: 6 }, LADDER)).toEqual({ to: 6, wrongWay: false });
    expect(resolveMove("demote", 8, { level: 4 }, LADDER)).toEqual({ to: 4, wrongWay: false });
  });

  it("never demotes on !promote (owner told 'high') nor promotes on !demote", () => {
    // Owner at 8, "high" starts at 4 → promoting to high would be a demotion.
    expect(resolveMove("promote", 8, { level: 4 }, LADDER)).toEqual({ to: 8, wrongWay: true });
    expect(resolveMove("promote", 4, { level: 4 }, LADDER)).toEqual({ to: 4, wrongWay: true });
    expect(resolveMove("demote", 2, { level: 6 }, LADDER)).toEqual({ to: 2, wrongWay: true });
  });
});

describe("parseMoveArgs", () => {
  it("reads a count, a tier or max", () => {
    expect(parseMoveArgs(["<@1>", "2"])).toEqual({ amount: 2, tier: null, max: false, unknown: null });
    expect(parseMoveArgs(["<@1>", "owner"]).tier).toBe(StaffTier.OWNER);
    expect(parseMoveArgs(["<@1>", "شيب"]).tier).toBe(StaffTier.SHIP);
    expect(parseMoveArgs(["<@1>", "high"]).tier).toBe(StaffTier.HIGHSTAFF);
    expect(parseMoveArgs(["<@1>", "max"]).max).toBe(true);
    expect(parseMoveArgs(["<@1>", "ماكس"]).max).toBe(true);
  });

  it("never reads a raw user id as a count", () => {
    expect(parseMoveArgs(["123456789012345678"])).toEqual({
      amount: null,
      tier: null,
      max: false,
      unknown: null,
    });
  });

  it("flags unknown words and mixing a count with a tier", () => {
    expect(parseMoveArgs(["<@1>", "banana"]).unknown).toBe("banana");
    expect(parseMoveArgs(["<@1>", "2", "owner"]).unknown).toBe("owner");
  });
});
