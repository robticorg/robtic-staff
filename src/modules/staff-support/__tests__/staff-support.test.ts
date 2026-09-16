import { describe, expect, it } from "bun:test";
import {
  DenyReason,
  staffManagementAuthorizationService as auth,
  type DemissionContextInput,
} from "../../staff/services/staff-management-authorization.service.ts";
import {
  SupportAudience,
  decideSupportVisibility,
} from "../services/staff-support-visibility.ts";

/** START 0 … HIGHSTAFF 3 … OWNER 6 … SHIP 9 … END 10 */
const BOUNDS = { ownerStartLevel: 6, shipStartLevel: 9 };

describe("decideSupportVisibility", () => {
  it("gives Staff Manager + Owner Manager sight of a normal staff ticket", () => {
    for (const applicantLevel of [0, 3, 5]) {
      expect(decideSupportVisibility({ ...BOUNDS, applicantLevel })).toBe(
        SupportAudience.STAFF_AND_OWNER_MANAGERS,
      );
    }
  });

  it("hides an Owner's ticket from the Staff Manager", () => {
    for (const applicantLevel of [6, 8]) {
      expect(decideSupportVisibility({ ...BOUNDS, applicantLevel })).toBe(
        SupportAudience.OWNER_MANAGER_ONLY,
      );
    }
  });

  it("restricts Ship and above to administrators", () => {
    for (const applicantLevel of [9, 10]) {
      expect(decideSupportVisibility({ ...BOUNDS, applicantLevel })).toBe(
        SupportAudience.ADMINISTRATORS_ONLY,
      );
    }
  });

  it("collapses to the wider audience when a boundary is not configured", () => {
    expect(
      decideSupportVisibility({ applicantLevel: 99, ownerStartLevel: null, shipStartLevel: null }),
    ).toBe(SupportAudience.STAFF_AND_OWNER_MANAGERS);
    // A Ship boundary alone still protects Ship.
    expect(
      decideSupportVisibility({ applicantLevel: 9, ownerStartLevel: null, shipStartLevel: 9 }),
    ).toBe(SupportAudience.ADMINISTRATORS_ONLY);
  });

  it("treats the boundary level itself as inside the tier", () => {
    expect(decideSupportVisibility({ ...BOUNDS, applicantLevel: 6 })).toBe(
      SupportAudience.OWNER_MANAGER_ONLY,
    );
    expect(decideSupportVisibility({ ...BOUNDS, applicantLevel: 9 })).toBe(
      SupportAudience.ADMINISTRATORS_ONLY,
    );
  });
});

const base: DemissionContextInput = {
  actorIsAdministrator: false,
  actorIsStaffManager: false,
  actorIsOwnerManager: false,
  targetLevel: 1,
  ...BOUNDS,
};

const decide = (over: Partial<DemissionContextInput>) =>
  auth.decideDemissionAuthorization({ ...base, ...over });

describe("decideDemissionAuthorization", () => {
  it("lets either manager action a normal staff resignation", () => {
    expect(decide({ actorIsStaffManager: true, targetLevel: 2 }).allowed).toBe(true);
    expect(decide({ actorIsOwnerManager: true, targetLevel: 2 }).allowed).toBe(true);
  });

  it("restricts an Owner's resignation to the Owner Manager", () => {
    expect(decide({ actorIsOwnerManager: true, targetLevel: 6 }).allowed).toBe(true);
    expect(decide({ actorIsStaffManager: true, targetLevel: 6 })).toMatchObject({
      allowed: false,
      reason: DenyReason.DEMISSION_TARGET_IN_OWNER,
    });
  });

  it("restricts Ship and above to administrators", () => {
    expect(decide({ actorIsStaffManager: true, targetLevel: 9 })).toMatchObject({
      allowed: false,
      reason: DenyReason.DEMISSION_TARGET_IN_SHIP,
    });
    expect(decide({ actorIsOwnerManager: true, targetLevel: 9 })).toMatchObject({
      allowed: false,
      reason: DenyReason.DEMISSION_TARGET_IN_SHIP,
    });
    expect(decide({ actorIsAdministrator: true, targetLevel: 9 }).allowed).toBe(true);
  });

  it("lets an administrator action every tier", () => {
    for (const targetLevel of [0, 5, 6, 9, 10]) {
      expect(decide({ actorIsAdministrator: true, targetLevel }).allowed).toBe(true);
    }
  });

  it("denies everyone else", () => {
    expect(decide({})).toMatchObject({
      allowed: false,
      reason: DenyReason.NOT_A_DEMISSION_MANAGER,
    });
  });
});
