import { describe, expect, it } from "bun:test";
import { STAFF_WARNING_FIRE_LEVEL } from "../types/enums.ts";
import { WarningOutcome, decideWarningOutcome } from "../services/warning-outcome.ts";

describe("what 3 warns costs", () => {
  it("warns 1 and 2 cost nothing but the role", () => {
    for (const level of [1, 2]) {
      for (const staffLevel of [0, 1, 5]) {
        expect(decideWarningOutcome(level, staffLevel)).toBe(WarningOutcome.NONE);
      }
    }
  });

  it("warn 3 demotes anyone who still has a rung below them", () => {
    for (const staffLevel of [1, 2, 7]) {
      expect(decideWarningOutcome(STAFF_WARNING_FIRE_LEVEL, staffLevel)).toBe(
        WarningOutcome.DEMOTE,
      );
    }
  });

  it("warn 3 at level 0 fires, because there is no rung left", () => {
    expect(decideWarningOutcome(STAFF_WARNING_FIRE_LEVEL, 0)).toBe(WarningOutcome.FIRE);
  });

  it("never returns an outcome that blacklists — warnings do not blacklist", () => {
    const seen = new Set<WarningOutcome>();
    for (const level of [1, 2, 3, 4]) {
      for (const staffLevel of [0, 1, 2, 9]) seen.add(decideWarningOutcome(level, staffLevel));
    }
    expect([...seen].sort()).toEqual(
      [WarningOutcome.DEMOTE, WarningOutcome.FIRE, WarningOutcome.NONE].sort(),
    );
  });
});

describe("the warning service applies that rule", () => {
  it("fires without the blacklist flag and clears warnings before demoting", async () => {
    const source = await Bun.file(
      "src/modules/warnings/services/warning-actions.service.ts",
    ).text();

    const consequence = source.slice(
      source.indexOf("private async applyWarningConsequence"),
      source.indexOf("private async postWarnLog"),
    );
    expect(consequence.length).toBeGreaterThan(0);

    // never blacklists
    expect(consequence).toContain("staffManagementService.fire(input.target, SYSTEM_ACTOR, false)");
    expect(consequence).not.toContain("SYSTEM_ACTOR, true");

    // warnings are spent before the demote, so the demote's role sync clears the
    // warn role instead of re-applying it
    expect(consequence.indexOf("expireRealWarnings")).toBeLessThan(
      consequence.indexOf("staffManagementService.demote"),
    );
  });
});
