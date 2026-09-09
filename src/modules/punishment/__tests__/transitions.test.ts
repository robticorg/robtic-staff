import { describe, expect, it } from "bun:test";
import {
  PunishmentStatus,
  assertPunishmentTransition,
  canPunishmentTransition,
  isDirectPunishment,
  requiresApproval,
  PunishmentType,
} from "../types/enums.ts";

const S = PunishmentStatus;

describe("punishment state machine", () => {
  it("allows the direct execution path", () => {
    expect(canPunishmentTransition(S.PENDING, S.EXECUTED)).toBe(true);
    expect(canPunishmentTransition(S.EXECUTED, S.REVOKED)).toBe(true);
  });

  it("allows the approval path", () => {
    expect(canPunishmentTransition(S.PENDING, S.APPROVAL)).toBe(true);
    expect(canPunishmentTransition(S.APPROVAL, S.APPROVED)).toBe(true);
    expect(canPunishmentTransition(S.APPROVAL, S.REJECTED)).toBe(true);
    expect(canPunishmentTransition(S.APPROVED, S.EXECUTED)).toBe(true);
    expect(canPunishmentTransition(S.APPROVED, S.FAILED)).toBe(true);
  });

  it("never executes a rejected punishment", () => {
    expect(canPunishmentTransition(S.REJECTED, S.EXECUTED)).toBe(false);
    expect(canPunishmentTransition(S.REJECTED, S.APPROVED)).toBe(false);
    expect(() => assertPunishmentTransition(S.REJECTED, S.EXECUTED)).toThrow(
      /Illegal punishment transition/,
    );
  });

  it("never re-executes an executed punishment", () => {
    expect(canPunishmentTransition(S.EXECUTED, S.EXECUTED)).toBe(true);
    expect(canPunishmentTransition(S.EXECUTED, S.APPROVED)).toBe(false);
    expect(canPunishmentTransition(S.EXECUTED, S.PENDING)).toBe(false);
  });

  it("allows a failed punishment to be retried but a revoked one is terminal", () => {
    expect(canPunishmentTransition(S.FAILED, S.EXECUTED)).toBe(true);
    expect(canPunishmentTransition(S.REVOKED, S.EXECUTED)).toBe(false);
  });
});

describe("type routing", () => {
  it("routes KICK / BAN through approval", () => {
    expect(requiresApproval(PunishmentType.KICK)).toBe(true);
    expect(requiresApproval(PunishmentType.BAN)).toBe(true);
  });

  it("executes WARN / TIMEOUT / MUTE / JAIL / NO_ACTION directly", () => {
    for (const t of [
      PunishmentType.WARN,
      PunishmentType.TIMEOUT,
      PunishmentType.MUTE,
      PunishmentType.JAIL,
      PunishmentType.NO_ACTION,
    ]) {
      expect(isDirectPunishment(t)).toBe(true);
      expect(requiresApproval(t)).toBe(false);
    }
  });
});
