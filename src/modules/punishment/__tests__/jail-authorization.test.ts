import { describe, expect, it } from "bun:test";
import {
  JailDenyReason,
  decideJailAuthorization,
  type JailAuthorizationInput,
} from "../services/jail-authorization.ts";

const input = (over: Partial<JailAuthorizationInput> = {}): JailAuthorizationInput => ({
  actorIsAdministrator: false,
  targetIsStaff: false,
  actorOutranksTarget: true,
  ...over,
});

describe("staff cannot jail staff", () => {
  it("refuses a staff target even when the actor outranks them", () => {
    const decision = decideJailAuthorization(input({ targetIsStaff: true }));

    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: JailDenyReason.TARGET_IS_STAFF });
  });

  it("refuses a staff target the actor does not outrank either", () => {
    expect(
      decideJailAuthorization(input({ targetIsStaff: true, actorOutranksTarget: false })),
    ).toMatchObject({ reason: JailDenyReason.TARGET_IS_STAFF });
  });
});

describe("nobody jails above their own rank", () => {
  it("refuses when the target's top role is not below the actor's", () => {
    const decision = decideJailAuthorization(input({ actorOutranksTarget: false }));

    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: JailDenyReason.TARGET_OUTRANKS_ACTOR });
  });

  it("allows a plain member the actor outranks", () => {
    expect(decideJailAuthorization(input())).toEqual({ allowed: true });
  });
});

describe("administrators are the escape hatch", () => {
  it("passes regardless of staff status or rank", () => {
    for (const targetIsStaff of [true, false]) {
      for (const actorOutranksTarget of [true, false]) {
        expect(
          decideJailAuthorization(
            input({ actorIsAdministrator: true, targetIsStaff, actorOutranksTarget }),
          ),
        ).toEqual({ allowed: true });
      }
    }
  });
});

describe("the jail path refuses before writing anything", () => {
  it("checks authorization ahead of creating the punishment", async () => {
    const source = await Bun.file(
      "src/modules/punishment/services/moderation-action.service.ts",
    ).text();

    const jail = source.slice(source.indexOf("async jail("), source.indexOf("async unjail("));
    expect(jail.length).toBeGreaterThan(0);

    // the guard must come before run(), so a refusal leaves no FAILED record
    expect(jail.indexOf("canJail(")).toBeLessThan(jail.indexOf("this.run("));
    expect(jail).toContain("punishment: null");
  });
});
