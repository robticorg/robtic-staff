import { describe, expect, it } from "bun:test";
import { StaffStatus } from "../types/enums.ts";
import {
  TransferProblem,
  collectTransferableRoles,
  filterAssignableRoles,
  validateTransfer,
  type TransferStateInput,
} from "../services/staff-transfer-rules.ts";

const base: TransferStateInput = {
  sourceId: "source",
  targetId: "target",
  targetIsBot: false,
  sourceStatus: StaffStatus.ACTIVE,
  sourceHoldsBlacklistRole: false,
  sourceHasOpenVacation: false,
  sourceActiveCases: 0,
  targetStatus: null,
  targetHoldsBlacklistRole: false,
  hierarchyValid: true,
  ladderConfigured: true,
  sourceLevel: 3,
};

describe("validateTransfer", () => {
  it("accepts an active staff source and a fresh target", () => {
    expect(validateTransfer(base)).toBeNull();
  });

  it("refuses a transfer to the same member or to a bot", () => {
    expect(validateTransfer({ ...base, targetId: "source" })).toBe(TransferProblem.SAME_MEMBER);
    expect(validateTransfer({ ...base, targetIsBot: true })).toBe(TransferProblem.TARGET_IS_BOT);
  });

  it("requires the source to be staff", () => {
    expect(validateTransfer({ ...base, sourceStatus: null })).toBe(
      TransferProblem.SOURCE_NOT_STAFF,
    );
    expect(validateTransfer({ ...base, sourceStatus: StaffStatus.FIRED })).toBe(
      TransferProblem.SOURCE_FIRED,
    );
    expect(validateTransfer({ ...base, sourceStatus: StaffStatus.TRANSFERRED })).toBe(
      TransferProblem.SOURCE_TRANSFERRED,
    );
  });

  it("refuses a blacklisted source by status or by role", () => {
    expect(validateTransfer({ ...base, sourceStatus: StaffStatus.BLACKLISTED })).toBe(
      TransferProblem.SOURCE_BLACKLISTED,
    );
    expect(validateTransfer({ ...base, sourceHoldsBlacklistRole: true })).toBe(
      TransferProblem.SOURCE_BLACKLISTED,
    );
  });

  it("refuses a source on break, by status or by an open vacation row", () => {
    expect(validateTransfer({ ...base, sourceStatus: StaffStatus.BREAK })).toBe(
      TransferProblem.SOURCE_ON_BREAK,
    );
    expect(validateTransfer({ ...base, sourceHasOpenVacation: true })).toBe(
      TransferProblem.SOURCE_ON_BREAK,
    );
  });

  it("refuses while the source still owns active cases", () => {
    expect(validateTransfer({ ...base, sourceActiveCases: 1 })).toBe(
      TransferProblem.SOURCE_HAS_ACTIVE_CASES,
    );
  });

  it("refuses rather than merging two live staff records", () => {
    expect(validateTransfer({ ...base, targetStatus: StaffStatus.ACTIVE })).toBe(
      TransferProblem.TARGET_ALREADY_STAFF,
    );
    expect(validateTransfer({ ...base, targetStatus: StaffStatus.BREAK })).toBe(
      TransferProblem.TARGET_ALREADY_STAFF,
    );
  });

  it("reuses a past identity — a fired or transferred target record is fine", () => {
    expect(validateTransfer({ ...base, targetStatus: StaffStatus.FIRED })).toBeNull();
    expect(validateTransfer({ ...base, targetStatus: StaffStatus.TRANSFERRED })).toBeNull();
  });

  it("refuses a blacklisted target", () => {
    expect(validateTransfer({ ...base, targetHoldsBlacklistRole: true })).toBe(
      TransferProblem.TARGET_BLACKLISTED,
    );
    expect(validateTransfer({ ...base, targetStatus: StaffStatus.BLACKLISTED })).toBe(
      TransferProblem.TARGET_BLACKLISTED,
    );
  });

  it("refuses to compute a level from an untrustworthy hierarchy", () => {
    expect(validateTransfer({ ...base, ladderConfigured: false })).toBe(
      TransferProblem.LADDER_NOT_CONFIGURED,
    );
    expect(validateTransfer({ ...base, hierarchyValid: false })).toBe(
      TransferProblem.HIERARCHY_INVALID,
    );
    expect(validateTransfer({ ...base, sourceLevel: null })).toBe(TransferProblem.LEVEL_UNKNOWN);
  });

  it("checks the source before the target — one fix at a time", () => {
    expect(
      validateTransfer({
        ...base,
        sourceStatus: StaffStatus.BLACKLISTED,
        targetStatus: StaffStatus.ACTIVE,
      }),
    ).toBe(TransferProblem.SOURCE_BLACKLISTED);
  });

  it("accepts level 0 — the floor is a real level, not a missing one", () => {
    expect(validateTransfer({ ...base, sourceLevel: 0 })).toBeNull();
  });
});

describe("filterAssignableRoles", () => {
  const input = {
    existing: new Set(["ok", "managed", "high"]),
    managed: new Set(["managed"]),
    manageable: new Set(["ok", "managed"]),
    everyoneRoleId: "guild",
  };

  it("keeps only roles that exist, are unmanaged and sit below the bot", () => {
    const result = filterAssignableRoles(["ok", "managed", "high", "gone", "guild"], input);
    expect(result.safe).toEqual(["ok"]);
    expect(result.rejected.sort()).toEqual(["gone", "guild", "high", "managed"]);
  });

  it("never returns @everyone", () => {
    expect(filterAssignableRoles(["guild"], input).safe).toEqual([]);
  });

  it("de-duplicates", () => {
    expect(filterAssignableRoles(["ok", "ok"], input).safe).toEqual(["ok"]);
  });
});

describe("collectTransferableRoles", () => {
  it("merges the level-driven set, the held access roles and the type role", () => {
    expect(
      collectTransferableRoles({
        levelDriven: ["marker", "lvl0", "lvl1"],
        heldAccess: ["access-a"],
        typeRole: "dev",
      }),
    ).toEqual(["marker", "lvl0", "lvl1", "access-a", "dev"]);
  });

  it("keeps only the access roles it was given — never the whole configured set", () => {
    const result = collectTransferableRoles({
      levelDriven: ["marker"],
      heldAccess: [],
      typeRole: null,
    });
    expect(result).toEqual(["marker"]);
  });

  it("de-duplicates a type role that is already level-driven", () => {
    expect(
      collectTransferableRoles({ levelDriven: ["dev"], heldAccess: [], typeRole: "dev" }),
    ).toEqual(["dev"]);
  });
});
