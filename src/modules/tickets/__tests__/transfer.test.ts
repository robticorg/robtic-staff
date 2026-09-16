import { describe, expect, it } from "bun:test";
import { TicketStatus } from "../types/enums.ts";
import { decideTransferEligibility } from "../services/ticket-permissions.ts";

const base = {
  transferable: true,
  ticketStatus: TicketStatus.CLAIMED,
  ticketIsClaimed: true,
  actorIsClaimer: true,
  actorIsAdministrator: false,
  targetIsBot: false,
  targetIsCurrentClaimer: false,
  targetIsTicketOwner: false,
  targetIsStaffOrAdministrator: true,
};

describe("decideTransferEligibility", () => {
  it("lets the current claimer hand a claimed ticket to a staff member", () => {
    expect(decideTransferEligibility(base)).toEqual({ ok: true });
  });

  it("refuses a panel with transferable = false", () => {
    expect(decideTransferEligibility({ ...base, transferable: false })).toEqual({
      ok: false,
      reason: "NOT_TRANSFERABLE",
    });
  });

  it("refuses a ticket nobody claimed yet", () => {
    expect(
      decideTransferEligibility({
        ...base,
        ticketIsClaimed: false,
        ticketStatus: TicketStatus.OPEN,
      }).reason,
    ).toBe("NOT_CLAIMED");
    expect(
      decideTransferEligibility({ ...base, ticketStatus: TicketStatus.CLOSED }).reason,
    ).toBe("NOT_CLAIMED");
  });

  it("only the claimer or an administrator may transfer", () => {
    expect(decideTransferEligibility({ ...base, actorIsClaimer: false }).reason).toBe(
      "NOT_ALLOWED",
    );
    expect(
      decideTransferEligibility({
        ...base,
        actorIsClaimer: false,
        actorIsAdministrator: true,
      }),
    ).toEqual({ ok: true });
  });

  it("refuses bots, the current claimer and the ticket's own opener as target", () => {
    expect(decideTransferEligibility({ ...base, targetIsBot: true }).reason).toBe("TARGET_IS_BOT");
    expect(decideTransferEligibility({ ...base, targetIsCurrentClaimer: true }).reason).toBe(
      "TARGET_IS_CLAIMER",
    );
    expect(decideTransferEligibility({ ...base, targetIsTicketOwner: true }).reason).toBe(
      "TARGET_IS_OWNER",
    );
  });

  it("refuses a target who is neither staff nor administrator", () => {
    expect(
      decideTransferEligibility({ ...base, targetIsStaffOrAdministrator: false }),
    ).toEqual({ ok: false, reason: "TARGET_NOT_STAFF" });
  });
});
