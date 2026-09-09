import { describe, expect, it } from "bun:test";
import { ModmailCaseStatus } from "../types/enums.ts";
import { assertTransition, canTransition } from "../types/transitions.ts";

const S = ModmailCaseStatus;

describe("case state machine", () => {
  it("allows the documented happy path", () => {
    expect(canTransition(S.PENDING, S.CLAIMED)).toBe(true);
    expect(canTransition(S.CLAIMED, S.INVESTIGATING)).toBe(true);
    expect(canTransition(S.INVESTIGATING, S.WAITING_USER)).toBe(true);
    expect(canTransition(S.WAITING_USER, S.INVESTIGATING)).toBe(true);
    expect(canTransition(S.INVESTIGATING, S.RESOLVED)).toBe(true);
    expect(canTransition(S.RESOLVED, S.CLOSED)).toBe(true);
  });

  it("treats a no-op transition as valid", () => {
    expect(canTransition(S.INVESTIGATING, S.INVESTIGATING)).toBe(true);
  });

  it("rejects CLOSED → anything", () => {
    expect(canTransition(S.CLOSED, S.CLAIMED)).toBe(false);
    expect(canTransition(S.CLOSED, S.INVESTIGATING)).toBe(false);
    expect(() => assertTransition(S.CLOSED, S.CLAIMED)).toThrow(/Illegal case transition/);
  });

  it("rejects skipping the claim step", () => {
    expect(canTransition(S.PENDING, S.INVESTIGATING)).toBe(false);
    expect(canTransition(S.PENDING, S.RESOLVED)).toBe(false);
  });

  it("rejects going back to PENDING", () => {
    expect(canTransition(S.CLAIMED, S.PENDING)).toBe(false);
    expect(canTransition(S.RESOLVED, S.PENDING)).toBe(false);
  });
});
