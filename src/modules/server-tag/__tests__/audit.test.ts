import { describe, expect, it } from "bun:test";
import { TagAuditAction, decideAuditAction } from "../services/server-tag-audit.service.ts";

const base = {
  usingTag: false,
  isStaff: false,
  hasActiveRestriction: false,
};

describe("decideAuditAction", () => {
  it("leaves a consistent member alone", () => {
    expect(decideAuditAction(base)).toBe(TagAuditAction.NONE);
    expect(decideAuditAction({ ...base, usingTag: true })).toBe(TagAuditAction.NONE);
    expect(decideAuditAction({ ...base, usingTag: true, isStaff: true })).toBe(TagAuditAction.NONE);
  });

  it("runs the restriction path for untagged staff", () => {
    expect(decideAuditAction({ ...base, isStaff: true })).toBe(TagAuditAction.REVOKE);
  });

  it("does not re-restrict staff who are already serving a restriction", () => {
    expect(
      decideAuditAction({ ...base, isStaff: true, hasActiveRestriction: true }),
    ).toBe(TagAuditAction.NONE);
  });

  it("lifts a restriction when the tag is back", () => {
    expect(
      decideAuditAction({ ...base, usingTag: true, isStaff: true, hasActiveRestriction: true }),
    ).toBe(TagAuditAction.LIFT);
  });

  it("never touches a plain member, tagged or not", () => {
    expect(decideAuditAction({ ...base, isStaff: false })).toBe(TagAuditAction.NONE);
    expect(decideAuditAction({ ...base, isStaff: false, usingTag: true })).toBe(TagAuditAction.NONE);
  });
});

describe("decideAuditAction with a display-name identifier", () => {
  it("leaves untagged staff alone when their display name carries an identifier", () => {
    expect(
      decideAuditAction({ ...base, isStaff: true, displayNameCompliant: true }),
    ).toBe(TagAuditAction.NONE);
  });

  it("lifts a restriction once the display name carries an identifier", () => {
    expect(
      decideAuditAction({
        ...base,
        isStaff: true,
        hasActiveRestriction: true,
        displayNameCompliant: true,
      }),
    ).toBe(TagAuditAction.LIFT);
  });
});
