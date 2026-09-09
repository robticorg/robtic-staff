import { describe, expect, it } from "bun:test";
import { decideGiftManager } from "../services/gift-claim-permissions.ts";
import {
  DECIDABLE_CLAIM_STATUSES,
  GiftClaimStatus,
  assertClaimTransition,
  canClaimTransition,
} from "../types/enums.ts";

describe("decideGiftManager (§6, §17)", () => {
  it("allows an Administrator", () => {
    expect(
      decideGiftManager({ isAdministrator: true, hasPanelSupportRole: false, hasGiftManagerRole: false }),
    ).toBe(true);
  });
  it("allows the ticket panel's support role (primary Gift Manager role)", () => {
    expect(
      decideGiftManager({ isAdministrator: false, hasPanelSupportRole: true, hasGiftManagerRole: false }),
    ).toBe(true);
  });
  it("allows the /role giftmanager role", () => {
    expect(
      decideGiftManager({ isAdministrator: false, hasPanelSupportRole: false, hasGiftManagerRole: true }),
    ).toBe(true);
  });
  it("rejects everyone else", () => {
    expect(
      decideGiftManager({ isAdministrator: false, hasPanelSupportRole: false, hasGiftManagerRole: false }),
    ).toBe(false);
  });
});

describe("gift-claim state machine (§17)", () => {
  const S = GiftClaimStatus;
  it("allows the documented flows", () => {
    expect(canClaimTransition(S.PENDING, S.RE_REQUESTED)).toBe(true);
    expect(canClaimTransition(S.PENDING, S.APPROVED)).toBe(true);
    expect(canClaimTransition(S.RE_REQUESTED, S.RE_REQUESTED)).toBe(true);
    expect(canClaimTransition(S.RE_REQUESTED, S.APPROVED)).toBe(true);
    expect(canClaimTransition(S.APPROVED, S.FULFILLED)).toBe(true);
  });
  it("does not fulfil before approval (§11)", () => {
    expect(canClaimTransition(S.PENDING, S.FULFILLED)).toBe(false);
    expect(canClaimTransition(S.RE_REQUESTED, S.FULFILLED)).toBe(false);
    expect(() => assertClaimTransition(S.PENDING, S.FULFILLED)).toThrow(/Illegal/);
  });
  it("keeps terminal states terminal", () => {
    for (const to of [S.PENDING, S.APPROVED, S.RE_REQUESTED]) {
      expect(canClaimTransition(S.REJECTED, to)).toBe(false);
      expect(canClaimTransition(S.FULFILLED, to)).toBe(false);
    }
  });
  it("marks PENDING + RE_REQUESTED as decidable", () => {
    expect(DECIDABLE_CLAIM_STATUSES).toEqual([S.PENDING, S.RE_REQUESTED]);
  });
});
