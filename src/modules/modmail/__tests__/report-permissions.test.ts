import { describe, expect, it } from "bun:test";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { ModmailCaseStatus } from "../types/enums.ts";
import {
  decideClaimEligibility,
  decideManageAccess,
  decideReporterInfoAccess,
} from "../services/report-permissions.service.ts";

describe("decideClaimEligibility", () => {
  const base = {
    memberIsStaff: true,
    memberIsReportedUser: false,
    caseStatus: ModmailCaseStatus.PENDING,
    alreadyClaimed: false,
  };

  it("lets an eligible staff member claim a fresh report", () => {
    expect(decideClaimEligibility(base)).toEqual({ ok: true });
  });

  it("blocks a non-staff member", () => {
    expect(decideClaimEligibility({ ...base, memberIsStaff: false }).ok).toBe(false);
  });

  it("blocks the reported user from claiming their own report", () => {
    const d = decideClaimEligibility({ ...base, memberIsReportedUser: true });
    expect(d.ok).toBe(false);
    expect(d.reason).toBe(modmailMessages.permissions.claimAboutYou);
  });

  it("blocks a second claim once the report is taken", () => {
    expect(decideClaimEligibility({ ...base, alreadyClaimed: true })).toEqual({
      ok: false,
      reason: modmailMessages.claim.alreadyClaimed,
    });
    expect(
      decideClaimEligibility({ ...base, caseStatus: ModmailCaseStatus.CLAIMED }).ok,
    ).toBe(false);
  });

  it("puts the self-report block ahead of the not-staff block", () => {
    const d = decideClaimEligibility({
      ...base,
      memberIsStaff: false,
      memberIsReportedUser: true,
    });
    expect(d.reason).toBe(modmailMessages.permissions.claimAboutYou);
  });
});

describe("decideManageAccess", () => {
  const base = {
    memberIsStaff: true,
    memberIsReportedUser: false,
    memberIsClaimer: false,
    memberIsStaffManager: false,
  };

  it("allows the assigned handler", () => {
    expect(decideManageAccess({ ...base, memberIsClaimer: true })).toBe(true);
  });

  it("allows a staff manager who did not claim", () => {
    expect(decideManageAccess({ ...base, memberIsStaffManager: true })).toBe(true);
  });

  it("denies a random staff member who did not claim", () => {
    expect(decideManageAccess(base)).toBe(false);
  });

  it("hard-blocks the reported user even if they are a staff manager", () => {
    expect(
      decideManageAccess({
        ...base,
        memberIsReportedUser: true,
        memberIsStaffManager: true,
        memberIsClaimer: true,
      }),
    ).toBe(false);
  });
});

describe("decideReporterInfoAccess", () => {
  it("is granted only to administrators", () => {
    expect(decideReporterInfoAccess({ isAdministrator: true })).toBe(true);
    expect(decideReporterInfoAccess({ isAdministrator: false })).toBe(false);
  });
});
