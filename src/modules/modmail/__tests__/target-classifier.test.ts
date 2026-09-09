import { describe, expect, it } from "bun:test";
import { ModmailCaseType } from "../types/enums.ts";
import { caseTypeForTarget, classifyTarget, isSnowflake, TargetKind } from "../services/target-classifier.ts";

describe("classifyTarget", () => {
  const staffRoleIds = ["role-staff", "role-helper", "role-mod"];

  it("flags a target that is not in the guild", () => {
    expect(classifyTarget({ inGuild: false, memberRoleIds: [], staffRoleIds })).toBe(
      TargetKind.NOT_IN_GUILD,
    );
  });

  it("classifies a member with no staff role as a normal user", () => {
    expect(
      classifyTarget({ inGuild: true, memberRoleIds: ["role-booster"], staffRoleIds }),
    ).toBe(TargetKind.USER);
  });

  it("classifies a member holding any staff role as staff", () => {
    expect(
      classifyTarget({ inGuild: true, memberRoleIds: ["role-booster", "role-mod"], staffRoleIds }),
    ).toBe(TargetKind.STAFF);
  });
});

describe("caseTypeForTarget", () => {
  it("maps kinds to report types", () => {
    expect(caseTypeForTarget(TargetKind.USER)).toBe(ModmailCaseType.USER_REPORT);
    expect(caseTypeForTarget(TargetKind.STAFF)).toBe(ModmailCaseType.STAFF_REPORT);
    expect(caseTypeForTarget(TargetKind.NOT_IN_GUILD)).toBeNull();
  });
});

describe("isSnowflake", () => {
  it("accepts 17-20 digit ids and rejects junk", () => {
    expect(isSnowflake("123456789012345678")).toBe(true);
    expect(isSnowflake("  123456789012345678 ")).toBe(true);
    expect(isSnowflake("not-an-id")).toBe(false);
    expect(isSnowflake("123")).toBe(false);
  });
});
