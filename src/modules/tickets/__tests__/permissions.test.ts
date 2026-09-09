import { describe, expect, it } from "bun:test";
import type { TicketClaimerConfig } from "../../../data/tickets/index.ts";
import { TicketStatus } from "../types/enums.ts";
import {
  decideClaimEligibility,
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
});

describe("decideManageAccess", () => {
  const base = {
    memberHasSupportRole: false,
    memberIsManager: false,
    memberIsAdministrator: false,
    memberIsClaimer: false,
    ticketClaimed: false,
  };

  it("managers and admins always manage", () => {
    expect(decideManageAccess({ ...base, memberIsManager: true })).toBe(true);
    expect(decideManageAccess({ ...base, memberIsAdministrator: true })).toBe(true);
  });

  it("before claim: any support member can manage", () => {
    expect(decideManageAccess({ ...base, memberHasSupportRole: true })).toBe(true);
  });

  it("after claim: only the claimer (or manager/admin) can manage", () => {
    expect(
      decideManageAccess({ ...base, memberHasSupportRole: true, ticketClaimed: true }),
    ).toBe(false);
    expect(
      decideManageAccess({ ...base, ticketClaimed: true, memberIsClaimer: true }),
    ).toBe(true);
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
