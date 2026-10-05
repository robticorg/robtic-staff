import { describe, expect, it } from "bun:test";
import { getPanel, LEGACY_TICKET_PREFIX, listPanels, ticketCounterKey, ticketPrefixOf } from "../../../data/tickets/index.ts";
import { canDecide } from "../responsibility-apply/decision.service.ts";

describe("ticket numbering per type", () => {
  it("keeps the support ticket on the existing shared counter", () => {
    expect(ticketPrefixOf(getPanel("support")!)).toBe(LEGACY_TICKET_PREFIX);
    expect(ticketCounterKey("g1", LEGACY_TICKET_PREFIX)).toBe("ticket:g1");
  });

  it("gives every other ticket type its own counter and prefix", () => {
    expect(ticketPrefixOf(getPanel("staff-application")!)).toBe("apply");
    expect(ticketPrefixOf(getPanel("responsibility-apply")!)).toBe("res");
    expect(ticketCounterKey("g1", "apply")).toBe("ticket:g1:apply");
  });

  it("never shares a prefix between two ticket types", () => {
    const prefixes = listPanels().map(ticketPrefixOf);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

describe("responsibility ticket decisions", () => {
  it("lets administrators and the ticket's manager role decide", () => {
    expect(canDecide({ isAdministrator: true, holdsManagerRole: false, isApplicant: false })).toBe(true);
    expect(canDecide({ isAdministrator: false, holdsManagerRole: true, isApplicant: false })).toBe(true);
  });

  it("refuses everyone else and the applicant themselves", () => {
    expect(canDecide({ isAdministrator: false, holdsManagerRole: false, isApplicant: false })).toBe(false);
    expect(canDecide({ isAdministrator: true, holdsManagerRole: true, isApplicant: true })).toBe(false);
  });
});
