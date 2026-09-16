import { describe, expect, it } from "bun:test";
import {
  DenyReason,
  staffManagementAuthorizationService as auth,
  type WarnContextInput,
} from "../services/staff-management-authorization.service.ts";

/** START 0 … HIGHSTAFF 3 … OWNER 6 … SHIP 9 … END 10 */
const base: WarnContextInput = {
  actorIsAdministrator: false,
  actorIsStaffManager: false,
  actorIsOwnerManager: false,
  isSelf: false,
  targetLevel: 1,
  ownerStartLevel: 6,
  shipStartLevel: 9,
};

const decide = (over: Partial<WarnContextInput>) =>
  auth.decideWarnAuthorization({ ...base, ...over });

describe("canWarn — Staff Manager", () => {
  const sm = { actorIsStaffManager: true };

  it("warns normal staff and high staff (below the Owner boundary)", () => {
    expect(decide({ ...sm, targetLevel: 0 }).allowed).toBe(true);
    expect(decide({ ...sm, targetLevel: 5 }).allowed).toBe(true);
  });

  it("cannot warn Owner tier", () => {
    expect(decide({ ...sm, targetLevel: 6 })).toMatchObject({
      allowed: false,
      reason: DenyReason.WARN_TARGET_IN_OWNER,
    });
  });

  it("cannot warn Ship tier", () => {
    expect(decide({ ...sm, targetLevel: 9 })).toMatchObject({
      allowed: false,
      reason: DenyReason.WARN_TARGET_IN_SHIP,
    });
  });
});

describe("canWarn — Owner Manager", () => {
  const om = { actorIsOwnerManager: true };

  it("warns the Owner tier", () => {
    expect(decide({ ...om, targetLevel: 6 }).allowed).toBe(true);
    expect(decide({ ...om, targetLevel: 8 }).allowed).toBe(true);
  });

  it("cannot warn normal staff or high staff", () => {
    expect(decide({ ...om, targetLevel: 0 })).toMatchObject({
      allowed: false,
      reason: DenyReason.WARN_TARGET_BELOW_OWNER,
    });
    expect(decide({ ...om, targetLevel: 5 }).allowed).toBe(false);
  });

  it("cannot warn Ship tier", () => {
    expect(decide({ ...om, targetLevel: 9 })).toMatchObject({
      allowed: false,
      reason: DenyReason.WARN_TARGET_IN_SHIP,
    });
  });
});

describe("canWarn — Administrator", () => {
  const admin = { actorIsAdministrator: true };

  it("warns every tier, Ship included", () => {
    for (const targetLevel of [0, 5, 6, 8, 9, 10]) {
      expect(decide({ ...admin, targetLevel }).allowed).toBe(true);
    }
  });

  it("still cannot warn themselves", () => {
    expect(decide({ ...admin, isSelf: true })).toMatchObject({
      allowed: false,
      reason: DenyReason.SELF_WARN,
    });
  });
});

describe("canWarn — everyone else", () => {
  it("is denied", () => {
    expect(decide({})).toMatchObject({ allowed: false, reason: DenyReason.NOT_A_WARN_MANAGER });
  });

  it("refuses self-warning before anything else", () => {
    expect(decide({ actorIsStaffManager: true, isSelf: true })).toMatchObject({
      allowed: false,
      reason: DenyReason.SELF_WARN,
    });
    expect(decide({ actorIsOwnerManager: true, isSelf: true })).toMatchObject({
      allowed: false,
      reason: DenyReason.SELF_WARN,
    });
  });
});

describe("canWarn — holding both manager roles", () => {
  const both = { actorIsStaffManager: true, actorIsOwnerManager: true };

  it("grants the union of both authorities", () => {
    expect(decide({ ...both, targetLevel: 1 }).allowed).toBe(true);
    expect(decide({ ...both, targetLevel: 7 }).allowed).toBe(true);
  });

  it("but still never reaches Ship", () => {
    expect(decide({ ...both, targetLevel: 9 }).allowed).toBe(false);
  });
});

describe("canWarn — unconfigured boundaries", () => {
  it("treats a missing Owner boundary as 'everything is normal staff'", () => {
    // Level 8 is below the Ship boundary, so only the Owner rule is in play.
    expect(
      decide({ actorIsStaffManager: true, ownerStartLevel: null, targetLevel: 8 }).allowed,
    ).toBe(true);
    expect(
      decide({ actorIsOwnerManager: true, ownerStartLevel: null, targetLevel: 8 }).allowed,
    ).toBe(false);
  });

  it("still protects Ship even with no Owner boundary", () => {
    expect(
      decide({ actorIsStaffManager: true, ownerStartLevel: null, targetLevel: 9 }).allowed,
    ).toBe(false);
  });

  it("treats a missing Ship boundary as 'no Ship tier to protect'", () => {
    expect(
      decide({ actorIsOwnerManager: true, shipStartLevel: null, targetLevel: 9 }).allowed,
    ).toBe(true);
  });
});
