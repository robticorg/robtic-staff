import { describe, expect, it } from "bun:test";
import {
  HierarchyProblem,
  RoleKind,
  getTierForLevel,
  getTierForRole,
  highestLevelFromRoleIds,
  validateHierarchy,
  type StaffHierarchy,
} from "../../configuration/utils/staff-levels.ts";
import { RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";

/**
 * The §28 example hierarchy.
 *
 *   Role2 START     level 0
 *   Role3           level 1
 *   Role4 IGNORE    — no level, consumes nothing
 *   Role5           level 2
 *   Role6 HIGHSTAFF level 3
 *   Role7           level 4
 *   Role8           level 5
 *   Role9 OWNER     level 6
 *   Role10          level 7
 *   Role11 SHIP     level 8
 *   Role12          level 9
 *   Role13 END      level 10
 */
const LADDER: [string, number][] = [
  ["role2", 0],
  ["role3", 1],
  ["role5", 2],
  ["role6", 3],
  ["role7", 4],
  ["role8", 5],
  ["role9", 6],
  ["role10", 7],
  ["role11", 8],
  ["role12", 9],
  ["role13", 10],
];

function makeHierarchy(overrides: Partial<StaffHierarchy> = {}): StaffHierarchy {
  const levelByRoleId = new Map(LADDER);
  return {
    guildId: "g1",
    levels: LADDER.map(([roleId, level]) => ({
      roleId,
      level,
      type: RoleConfigType.STAFF,
    })),
    levelByRoleId,
    ignoredRoleIds: new Set(["role4"]),
    generalStaffRoleId: "role1",
    startLevel: 0,
    endLevel: 10,
    boundaryLevels: {
      [StaffTier.STAFF]: 0,
      [StaffTier.HIGHSTAFF]: 3,
      [StaffTier.OWNER]: 6,
      [StaffTier.SHIP]: 8,
    },
    boundaryRoleIds: {
      [StaffTier.STAFF]: "role2",
      [StaffTier.HIGHSTAFF]: "role6",
      [StaffTier.OWNER]: "role9",
      [StaffTier.SHIP]: "role11",
    },
    ...overrides,
  };
}

describe("tier calculation", () => {
  const h = makeHierarchy();

  it("derives tiers from the configured boundaries, not fixed ranges", () => {
    expect(getTierForLevel(h, 0)).toBe(StaffTier.STAFF);
    expect(getTierForLevel(h, 2)).toBe(StaffTier.STAFF);
    expect(getTierForLevel(h, 3)).toBe(StaffTier.HIGHSTAFF);
    expect(getTierForLevel(h, 5)).toBe(StaffTier.HIGHSTAFF);
    expect(getTierForLevel(h, 6)).toBe(StaffTier.OWNER);
    expect(getTierForLevel(h, 7)).toBe(StaffTier.OWNER);
    expect(getTierForLevel(h, 8)).toBe(StaffTier.SHIP);
    expect(getTierForLevel(h, 10)).toBe(StaffTier.SHIP);
  });

  it("moves every tier when the boundaries move", () => {
    const shifted = makeHierarchy({
      boundaryLevels: {
        [StaffTier.STAFF]: 0,
        [StaffTier.HIGHSTAFF]: 5,
        [StaffTier.OWNER]: 9,
        [StaffTier.SHIP]: 10,
      },
    });
    expect(getTierForLevel(shifted, 4)).toBe(StaffTier.STAFF);
    expect(getTierForLevel(shifted, 5)).toBe(StaffTier.HIGHSTAFF);
    expect(getTierForLevel(shifted, 8)).toBe(StaffTier.HIGHSTAFF);
    expect(getTierForLevel(shifted, 9)).toBe(StaffTier.OWNER);
    expect(getTierForLevel(shifted, 10)).toBe(StaffTier.SHIP);
  });

  it("falls back to STAFF when no boundary is configured", () => {
    const flat = makeHierarchy({
      boundaryLevels: {
        [StaffTier.STAFF]: 0,
        [StaffTier.HIGHSTAFF]: null,
        [StaffTier.OWNER]: null,
        [StaffTier.SHIP]: null,
      },
      boundaryRoleIds: {
        [StaffTier.STAFF]: "role2",
        [StaffTier.HIGHSTAFF]: null,
        [StaffTier.OWNER]: null,
        [StaffTier.SHIP]: null,
      },
    });
    expect(getTierForLevel(flat, 10)).toBe(StaffTier.STAFF);
  });
});

describe("getTierForRole", () => {
  const h = makeHierarchy();

  it("reports the START role as level 0 in the STAFF tier (§17)", () => {
    const info = getTierForRole(h, "role2");
    expect(info.kind).toBe(RoleKind.NUMBERED);
    expect(info.level).toBe(0);
    expect(info.tier).toBe(StaffTier.STAFF);
    expect(info.isStart).toBe(true);
  });

  it("reports an ordinary numbered role", () => {
    const info = getTierForRole(h, "role7");
    expect(info.level).toBe(4);
    expect(info.tier).toBe(StaffTier.HIGHSTAFF);
    expect(info.opensTier).toBeNull();
  });

  it("flags each boundary role as opening its tier (§17)", () => {
    expect(getTierForRole(h, "role6").opensTier).toBe(StaffTier.HIGHSTAFF);
    expect(getTierForRole(h, "role9").opensTier).toBe(StaffTier.OWNER);
    expect(getTierForRole(h, "role11").opensTier).toBe(StaffTier.SHIP);
  });

  it("reports the END role at the maximum level", () => {
    const info = getTierForRole(h, "role13");
    expect(info.level).toBe(10);
    expect(info.isEnd).toBe(true);
    expect(info.tier).toBe(StaffTier.SHIP);
  });

  it("gives an ignored role no level and no tier (§15)", () => {
    const info = getTierForRole(h, "role4");
    expect(info.kind).toBe(RoleKind.IGNORED);
    expect(info.level).toBeNull();
    expect(info.tier).toBeNull();
  });

  it("reports a role outside the ladder as OUTSIDE (§16)", () => {
    const info = getTierForRole(h, "some-community-role");
    expect(info.kind).toBe(RoleKind.OUTSIDE);
    expect(info.level).toBeNull();
    expect(info.tier).toBeNull();
  });
});

describe("highestLevelFromRoleIds", () => {
  const h = makeHierarchy();

  it("takes the highest numbered role, not the first (§8)", () => {
    expect(highestLevelFromRoleIds(h, ["role2", "role3", "role5", "role6"])).toBe(3);
    expect(highestLevelFromRoleIds(h, ["role6", "role5", "role3", "role2"])).toBe(3);
  });

  it("ignores ignored roles entirely (§3)", () => {
    // Role4 is IGNORE — present or not, the answer is Role5's level.
    expect(highestLevelFromRoleIds(h, ["role2", "role4", "role5"])).toBe(2);
    expect(highestLevelFromRoleIds(h, ["role4"])).toBeNull();
  });

  it("ignores roles outside the ladder", () => {
    expect(highestLevelFromRoleIds(h, ["community", "booster", "role3"])).toBe(1);
  });

  it("returns null when no numbered role is present (§7)", () => {
    expect(highestLevelFromRoleIds(h, ["role1", "community"])).toBeNull();
    expect(highestLevelFromRoleIds(h, [])).toBeNull();
  });
});

describe("hierarchy validation (§19)", () => {
  it("accepts a well-formed hierarchy", () => {
    expect(validateHierarchy(makeHierarchy())).toEqual([]);
  });

  it("reports a missing START and END", () => {
    const issues = validateHierarchy(makeHierarchy({ startLevel: null, endLevel: null }));
    expect(issues.map((i) => i.problem)).toEqual([
      HierarchyProblem.START_NOT_CONFIGURED,
      HierarchyProblem.END_NOT_CONFIGURED,
    ]);
  });

  it("reports a boundary whose role left the ladder", () => {
    const issues = validateHierarchy(
      makeHierarchy({
        boundaryLevels: {
          [StaffTier.STAFF]: 0,
          [StaffTier.HIGHSTAFF]: null,
          [StaffTier.OWNER]: 6,
          [StaffTier.SHIP]: 8,
        },
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.problem).toBe(HierarchyProblem.BOUNDARY_NOT_ON_LADDER);
    expect(issues[0]!.tier).toBe(StaffTier.HIGHSTAFF);
  });

  it("reports boundaries that are out of order", () => {
    const issues = validateHierarchy(
      makeHierarchy({
        boundaryLevels: {
          [StaffTier.STAFF]: 0,
          [StaffTier.HIGHSTAFF]: 6,
          [StaffTier.OWNER]: 3,
          [StaffTier.SHIP]: 8,
        },
      }),
    );
    expect(issues.map((i) => i.problem)).toContain(HierarchyProblem.BOUNDARY_OUT_OF_ORDER);
    expect(issues.find((i) => i.problem === HierarchyProblem.BOUNDARY_OUT_OF_ORDER)!.tier).toBe(
      StaffTier.OWNER,
    );
  });

  it("rejects a boundary sitting on the START level", () => {
    const issues = validateHierarchy(
      makeHierarchy({
        boundaryLevels: {
          [StaffTier.STAFF]: 0,
          [StaffTier.HIGHSTAFF]: 0,
          [StaffTier.OWNER]: 6,
          [StaffTier.SHIP]: 8,
        },
      }),
    );
    expect(issues.map((i) => i.problem)).toContain(HierarchyProblem.BOUNDARY_OUT_OF_ORDER);
  });
});
