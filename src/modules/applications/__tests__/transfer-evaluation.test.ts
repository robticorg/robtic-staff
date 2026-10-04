import { describe, expect, it } from "bun:test";
import { staffTransferRules, type StaffTransferRules } from "../../../data/staff-application/config.ts";
import { StaffTier } from "../../configuration/types/enums.ts";
import {
  StaffTransferEvaluationService,
  TransferIneligibility,
  type EvaluationHierarchy,
} from "../transfer/staff-transfer-evaluation.service.ts";

const rules: StaffTransferRules = {
  ...staffTransferRules,
  minimumSourceMemberCount: 4000,
  targetTier: StaffTier.STAFF,
  memberCountBonus: [{ min: 10_000, levels: 1 }],
  onlineCountBonus: [{ min: 1_000, levels: 1 }],
  membershipBonus: [{ min: 30, levels: 1 }],
};

const evaluator = new StaffTransferEvaluationService(rules);

const hierarchy: EvaluationHierarchy = {
  levels: Array.from({ length: 31 }, (_, level) => ({ roleId: `r${level}`, level })),
  boundaryLevels: {
    [StaffTier.STAFF]: 0,
    [StaffTier.HIGHSTAFF]: 10,
    [StaffTier.OWNER]: 20,
    [StaffTier.SHIP]: 25,
  },
};

const input = (overrides: Partial<Parameters<typeof evaluator.evaluate>[0]> = {}) => ({
  sourceMemberCount: 4000,
  sourceOnlineCount: 0,
  membershipDays: 0,
  ...overrides,
});

describe("transfer evaluation", () => {
  it("marks a server under 4000 members ineligible and proposes nothing", () => {
    const result = evaluator.evaluate(input({ sourceMemberCount: 3999 }), hierarchy);
    expect(result.eligible).toBe(false);
    expect(result.ineligibleReasons).toEqual([TransferIneligibility.MEMBER_COUNT]);
    expect(result.proposedStaffLevel).toBeNull();
  });

  it("has no role condition: any server with enough members is eligible", () => {
    const result = evaluator.evaluate(input(), hierarchy);
    expect(result.eligible).toBe(true);
    expect(result.ineligibleReasons).toEqual([]);
  });

  it("proposes the Staff tier start plus member, online and membership bonuses", () => {
    expect(evaluator.evaluate(input(), hierarchy).proposedStaffLevel).toBe(0);
    const result = evaluator.evaluate(
      input({ sourceMemberCount: 20_000, sourceOnlineCount: 2000, membershipDays: 60 }),
      hierarchy,
    );
    expect(result.proposedTier).toBe(StaffTier.STAFF);
    expect(result.proposedStaffLevel).toBe(3);
    expect(result.proposedStaffRoleId).toBe("r3");
  });

  it("stays inside the proposed tier", () => {
    const tight = { ...hierarchy, boundaryLevels: { ...hierarchy.boundaryLevels, [StaffTier.HIGHSTAFF]: 2 } };
    const result = evaluator.evaluate(
      input({ sourceMemberCount: 20_000, sourceOnlineCount: 2000, membershipDays: 60 }),
      tight,
    );
    expect(result.proposedStaffLevel).toBe(1);
  });

  it("counts membership in whole days from the guild join date", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    expect(evaluator.membershipDays(new Date("2026-09-17T12:00:00Z"), now)).toBe(10);
    expect(evaluator.membershipDays(null, now)).toBe(0);
  });
});
