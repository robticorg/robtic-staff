import { describe, expect, it } from "bun:test";
import { TicketStatus, assertTicketTransition, canTicketTransition } from "../types/enums.ts";

const S = TicketStatus;

describe("ticket state machine", () => {
  it("allows the normal lifecycle", () => {
    expect(canTicketTransition(S.OPEN, S.CLAIMED)).toBe(true);
    expect(canTicketTransition(S.CLAIMED, S.CLOSING)).toBe(true);
    expect(canTicketTransition(S.CLOSING, S.CLOSED)).toBe(true);
    expect(canTicketTransition(S.CLOSED, S.DELETED)).toBe(true);
    expect(canTicketTransition(S.OPEN, S.CLOSED)).toBe(true);
  });

  it("keeps DELETED terminal (the DB record stays, but no more transitions)", () => {
    expect(canTicketTransition(S.DELETED, S.OPEN)).toBe(false);
    expect(canTicketTransition(S.DELETED, S.CLOSED)).toBe(false);
    expect(() => assertTicketTransition(S.DELETED, S.OPEN)).toThrow(/Illegal ticket transition/);
  });

  it("rejects re-claiming a closed ticket directly", () => {
    expect(canTicketTransition(S.CLOSED, S.CLAIMED)).toBe(false);
  });

  it("treats a same-status transition as a no-op", () => {
    expect(canTicketTransition(S.CLAIMED, S.CLAIMED)).toBe(true);
  });
});
