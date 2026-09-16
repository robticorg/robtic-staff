import { describe, expect, it } from "bun:test";
import { TagAuditAction, decideAuditAction } from "../services/server-tag-audit.service.ts";

const base = {
  usingTag: false,
  hasTagRole: false,
  isStaff: false,
  hasActiveRestriction: false,
};

describe("decideAuditAction", () => {
  it("leaves a consistent member alone", () => {
    expect(decideAuditAction(base)).toBe(TagAuditAction.NONE);
    expect(decideAuditAction({ ...base, usingTag: true, hasTagRole: true })).toBe(
      TagAuditAction.NONE,
    );
  });

  it("grants the tag role to someone using the tag without it", () => {
    expect(decideAuditAction({ ...base, usingTag: true })).toBe(TagAuditAction.GRANT);
  });

  it("revokes the tag role from someone holding it without the tag", () => {
    expect(decideAuditAction({ ...base, hasTagRole: true })).toBe(TagAuditAction.REVOKE);
  });

  it("runs the restriction path for untagged staff, even with no tag role", () => {
    expect(decideAuditAction({ ...base, isStaff: true })).toBe(TagAuditAction.REVOKE);
  });

  it("does not re-restrict staff who are already serving a restriction", () => {
    expect(
      decideAuditAction({ ...base, isStaff: true, hasActiveRestriction: true }),
    ).toBe(TagAuditAction.NONE);
  });

  it("still strips the role from a restricted staff member who kept it", () => {
    expect(
      decideAuditAction({ ...base, isStaff: true, hasActiveRestriction: true, hasTagRole: true }),
    ).toBe(TagAuditAction.REVOKE);
  });

  it("lifts a restriction when the tag is back and the role is already correct", () => {
    expect(
      decideAuditAction({
        ...base,
        usingTag: true,
        hasTagRole: true,
        isStaff: true,
        hasActiveRestriction: true,
      }),
    ).toBe(TagAuditAction.LIFT);
  });

  it("grant wins over lift — the role is restored on the same pass", () => {
    expect(
      decideAuditAction({ ...base, usingTag: true, isStaff: true, hasActiveRestriction: true }),
    ).toBe(TagAuditAction.GRANT);
  });

  it("never touches a plain member who has neither the tag nor the role", () => {
    expect(decideAuditAction({ ...base, isStaff: false })).toBe(TagAuditAction.NONE);
  });
});
