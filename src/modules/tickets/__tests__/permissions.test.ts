import { describe, expect, it } from "bun:test";
import type { TicketClaimerConfig } from "../../../data/tickets/index.ts";
import { TicketStatus } from "../types/enums.ts";
import {
  decideClaimEligibility,
  decideClosedTicketAccess,
  decideManageAccess,
  protectedTicketPrincipals,
} from "../services/ticket-permissions.ts";

const claimer: TicketClaimerConfig = {
  supportRoleCanClaim: true,
  managersCanClaim: true,
  onlyOnce: true,
  transferable: false,
};

describe("decideClaimEligibility", () => {
  const base = {
    memberHasSupportRole: true,
    memberIsManager: false,
    memberIsAdministrator: false,
    memberIsOwner: false,
    claimer,
    ticketStatus: TicketStatus.OPEN,
    alreadyClaimed: false,
  };

  it("lets an eligible support member claim an open, unclaimed ticket", () => {
    expect(decideClaimEligibility(base)).toEqual({ ok: true });
  });

  it("blocks a non-support, non-manager, non-admin member", () => {
    expect(
      decideClaimEligibility({ ...base, memberHasSupportRole: false }).ok,
    ).toBe(false);
  });

  it("respects claimer.supportRoleCanClaim = false", () => {
    const strict = { ...claimer, supportRoleCanClaim: false };
    expect(decideClaimEligibility({ ...base, claimer: strict }).ok).toBe(false);
    expect(
      decideClaimEligibility({ ...base, claimer: strict, memberIsManager: true }).ok,
    ).toBe(true);
  });

  it("blocks a second claim (already claimed / not open)", () => {
    expect(decideClaimEligibility({ ...base, alreadyClaimed: true })).toMatchObject({ ok: false });
    expect(
      decideClaimEligibility({ ...base, ticketStatus: TicketStatus.CLAIMED }).reason,
    ).toBe("NOT_OPEN");
  });

  it("always allows an administrator regardless of claimer flags", () => {
    const strict = { ...claimer, supportRoleCanClaim: false, managersCanClaim: false };
    expect(
      decideClaimEligibility({
        ...base,
        claimer: strict,
        memberHasSupportRole: false,
        memberIsAdministrator: true,
      }),
    ).toEqual({ ok: true });
  });

  it("blocks the ticket's own opener even as an administrator/manager/support", () => {
    expect(decideClaimEligibility({ ...base, memberIsOwner: true })).toEqual({
      ok: false,
      reason: "IS_OWNER",
    });
    expect(
      decideClaimEligibility({ ...base, memberIsOwner: true, memberIsAdministrator: true }),
    ).toMatchObject({ ok: false, reason: "IS_OWNER" });
    expect(
      decideClaimEligibility({ ...base, memberIsOwner: true, memberIsManager: true }),
    ).toMatchObject({ ok: false, reason: "IS_OWNER" });
  });
});

describe("decideManageAccess", () => {
  const base = {
    memberIsAdministrator: false,
    memberIsClaimer: false,
  };

  it("admins always manage", () => {
    expect(decideManageAccess({ ...base, memberIsAdministrator: true })).toBe(true);
  });

  it("only the claimer manages otherwise — nobody else, claimed or not", () => {
    expect(decideManageAccess(base)).toBe(false);
    expect(decideManageAccess({ ...base, memberIsClaimer: true })).toBe(true);
  });
});

describe("protectedTicketPrincipals", () => {
  it("always protects owner, claimer and the panel support role", () => {
    const set = protectedTicketPrincipals(
      { userId: "owner", claimedByDiscordId: "claimer" },
      { supportRoleId: "support" },
    );
    expect([...set].sort()).toEqual(["claimer", "owner", "support"]);
  });

  it("omits the claimer entry when the ticket is unclaimed", () => {
    const set = protectedTicketPrincipals({ userId: "owner" }, { supportRoleId: "support" });
    expect(set.has("owner")).toBe(true);
    expect(set.has("support")).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe("decideClosedTicketAccess", () => {
  const base = {
    memberIsAdministrator: false,
    memberIsManager: false,
    memberIsClaimer: false,
    memberHasPanelSupportRole: false,
  };

  it("refuses a member with none of the four roles", () => {
    expect(decideClosedTicketAccess(base)).toBe(false);
  });

  it("lets the panel's own support staff clean up, unlike decideManageAccess", () => {
    const supporter = { ...base, memberHasPanelSupportRole: true };
    expect(decideClosedTicketAccess(supporter)).toBe(true);
    expect(
      decideManageAccess({ memberIsAdministrator: false, memberIsClaimer: false }),
    ).toBe(false);
  });

  it("lets an admin, a ticket manager or the former claimer in", () => {
    expect(decideClosedTicketAccess({ ...base, memberIsAdministrator: true })).toBe(true);
    expect(decideClosedTicketAccess({ ...base, memberIsManager: true })).toBe(true);
    expect(decideClosedTicketAccess({ ...base, memberIsClaimer: true })).toBe(true);
  });
});
