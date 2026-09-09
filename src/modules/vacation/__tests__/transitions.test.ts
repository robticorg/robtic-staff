import { describe, expect, it } from "bun:test";
import {
  OPEN_VACATION_STATUSES,
  VacationStatus,
  assertVacationTransition,
  canVacationTransition,
} from "../types/enums.ts";

const S = VacationStatus;

describe("vacation state machine", () => {
  it("allows the application happy path", () => {
    expect(canVacationTransition(S.PENDING, S.APPROVED)).toBe(true);
    expect(canVacationTransition(S.APPROVED, S.ACTIVE)).toBe(true);
    expect(canVacationTransition(S.ACTIVE, S.COMPLETED)).toBe(true);
  });

  it("allows the manual + early-end paths", () => {
    expect(canVacationTransition(S.PENDING, S.ACTIVE)).toBe(true);
    expect(canVacationTransition(S.ACTIVE, S.CANCELLED)).toBe(true);
    expect(canVacationTransition(S.APPROVED, S.PENDING)).toBe(true);
  });

  it("never flips a decided request the other way (§21)", () => {
    expect(canVacationTransition(S.APPROVED, S.REJECTED)).toBe(false);
    expect(canVacationTransition(S.REJECTED, S.APPROVED)).toBe(false);
    expect(canVacationTransition(S.REJECTED, S.ACTIVE)).toBe(false);
    expect(() => assertVacationTransition(S.REJECTED, S.APPROVED)).toThrow(
      /Illegal vacation transition/,
    );
  });

  it("treats terminal states as terminal", () => {
    for (const to of [S.ACTIVE, S.PENDING, S.APPROVED]) {
      expect(canVacationTransition(S.COMPLETED, to)).toBe(false);
      expect(canVacationTransition(S.CANCELLED, to)).toBe(false);
    }
  });

  it("counts PENDING / APPROVED / ACTIVE as open", () => {
    expect(OPEN_VACATION_STATUSES).toEqual([S.PENDING, S.APPROVED, S.ACTIVE]);
    expect(OPEN_VACATION_STATUSES).not.toContain(S.COMPLETED);
    expect(OPEN_VACATION_STATUSES).not.toContain(S.REJECTED);
  });
});
