import { describe, expect, it } from "bun:test";
import { isReviewerConflicted } from "../services/appeal-permissions.service.ts";
import {
  AppealStatus,
  DECIDABLE_APPEAL_STATUSES,
  assertAppealTransition,
  canAppealTransition,
} from "../types/enums.ts";

describe("isReviewerConflicted (§15, §33)", () => {
  it("blocks the punishment issuer", () => {
    expect(isReviewerConflicted({ reviewerId: "u1", issuerId: "u1" })).toBe(true);
  });
  it("blocks the approver (KICK/BAN)", () => {
    expect(isReviewerConflicted({ reviewerId: "u2", approverId: "u2" })).toBe(true);
  });
  it("blocks the original investigator when known", () => {
    expect(isReviewerConflicted({ reviewerId: "u3", investigatorId: "u3" })).toBe(true);
  });
  it("allows an unrelated reviewer", () => {
    expect(
      isReviewerConflicted({
        reviewerId: "rev",
        issuerId: "a",
        approverId: "b",
        investigatorId: "c",
      }),
    ).toBe(false);
  });
  it("treats null / undefined roles as no conflict", () => {
    expect(isReviewerConflicted({ reviewerId: "rev", issuerId: null, investigatorId: undefined })).toBe(
      false,
    );
  });
});

describe("appeal state machine", () => {
  const S = AppealStatus;
  it("allows the review happy paths", () => {
    expect(canAppealTransition(S.PENDING, S.CLAIMED)).toBe(true);
    expect(canAppealTransition(S.PENDING, S.ACCEPTED)).toBe(true);
    expect(canAppealTransition(S.CLAIMED, S.ACCEPTED)).toBe(true);
    expect(canAppealTransition(S.CLAIMED, S.REJECTED)).toBe(true);
    expect(canAppealTransition(S.UNDER_REVIEW, S.REJECTED)).toBe(true);
  });
  it("makes decided appeals terminal (§33)", () => {
    expect(canAppealTransition(S.ACCEPTED, S.REJECTED)).toBe(false);
    expect(canAppealTransition(S.REJECTED, S.ACCEPTED)).toBe(false);
    expect(canAppealTransition(S.ACCEPTED, S.PENDING)).toBe(false);
    expect(() => assertAppealTransition(S.REJECTED, S.ACCEPTED)).toThrow(/Illegal appeal transition/);
  });
  it("lists PENDING/CLAIMED/UNDER_REVIEW as decidable", () => {
    expect(DECIDABLE_APPEAL_STATUSES).toEqual([S.PENDING, S.CLAIMED, S.UNDER_REVIEW]);
  });
});
