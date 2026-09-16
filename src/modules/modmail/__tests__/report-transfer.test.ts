import { describe, expect, it } from "bun:test";
import {
  decideTransferEligibility,
  type ReportTransferInput,
} from "../services/report-permissions.service.ts";

const base: ReportTransferInput = {
  caseIsOpen: true,
  caseIsClaimed: true,
  actorIsHandler: true,
  actorIsAdministrator: false,
  targetIsBot: false,
  targetIsCurrentHandler: false,
  targetIsReportedUser: false,
  targetIsStaffOrAdministrator: true,
};

const decide = (over: Partial<ReportTransferInput>) =>
  decideTransferEligibility({ ...base, ...over });

describe("decideTransferEligibility", () => {
  it("lets the current handler hand a claimed report to another staff member", () => {
    expect(decide({})).toEqual({ ok: true });
  });

  it("refuses a closed report", () => {
    expect(decide({ caseIsOpen: false })).toMatchObject({ ok: false, reason: "CLOSED" });
  });

  it("refuses a report nobody has claimed", () => {
    expect(decide({ caseIsClaimed: false })).toMatchObject({
      ok: false,
      reason: "NOT_CLAIMED",
    });
  });

  it("only the handler or an administrator may transfer", () => {
    expect(decide({ actorIsHandler: false })).toMatchObject({
      ok: false,
      reason: "NOT_ALLOWED",
    });
    expect(decide({ actorIsHandler: false, actorIsAdministrator: true })).toEqual({ ok: true });
  });

  it("refuses bots, the current handler, and the reported user as target", () => {
    expect(decide({ targetIsBot: true }).reason).toBe("TARGET_IS_BOT");
    expect(decide({ targetIsCurrentHandler: true }).reason).toBe("TARGET_IS_HANDLER");
    expect(decide({ targetIsReportedUser: true }).reason).toBe("TARGET_IS_REPORTED");
  });

  it("refuses a target who is neither staff nor administrator", () => {
    expect(decide({ targetIsStaffOrAdministrator: false })).toMatchObject({
      ok: false,
      reason: "TARGET_NOT_STAFF",
    });
  });

  it("checks the report's own state before the target's", () => {
    expect(decide({ caseIsOpen: false, targetIsBot: true }).reason).toBe("CLOSED");
  });
});
