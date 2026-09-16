import { describe, expect, it } from "bun:test";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { WarningCategory } from "../types/enums.ts";
import {
  OTHER_CATEGORY,
  categoryFilter,
  decideWarningCategory,
  warnRoleTypes,
  warningCategoryOf,
} from "../services/warning-category.ts";
import { formatStaffWarningMessage } from "../render/staff-warn-message.ts";

describe("decideWarningCategory", () => {
  it("puts everyone below the Owner boundary on the normal ladder", () => {
    expect(decideWarningCategory(0, 6)).toBe(WarningCategory.STAFF);
    expect(decideWarningCategory(5, 6)).toBe(WarningCategory.STAFF);
  });

  it("puts Owner tier and above on the owner ladder", () => {
    expect(decideWarningCategory(6, 6)).toBe(WarningCategory.OWNER);
    expect(decideWarningCategory(9, 6)).toBe(WarningCategory.OWNER);
  });

  it("falls back to the normal ladder when no Owner boundary is configured", () => {
    expect(decideWarningCategory(99, null)).toBe(WarningCategory.STAFF);
  });
});

describe("warnRoleTypes", () => {
  it("maps each category to its own three slots — never shared", () => {
    expect(warnRoleTypes(WarningCategory.STAFF)).toEqual({
      1: RoleConfigType.WARN_1,
      2: RoleConfigType.WARN_2,
      3: RoleConfigType.WARN_3,
    });
    expect(warnRoleTypes(WarningCategory.OWNER)).toEqual({
      1: RoleConfigType.OWNER_WARN_1,
      2: RoleConfigType.OWNER_WARN_2,
      3: RoleConfigType.OWNER_WARN_3,
    });
  });
});

describe("warningCategoryOf", () => {
  it("treats rows written before the field existed as normal staff warnings", () => {
    expect(warningCategoryOf({})).toBe(WarningCategory.STAFF);
    expect(warningCategoryOf(undefined)).toBe(WarningCategory.STAFF);
    expect(warningCategoryOf({ category: null })).toBe(WarningCategory.STAFF);
  });

  it("reads a stored category", () => {
    expect(warningCategoryOf({ category: WarningCategory.OWNER })).toBe(WarningCategory.OWNER);
  });
});

describe("categoryFilter", () => {
  it("matches legacy rows for STAFF (a $in with null also matches a missing field)", () => {
    expect(categoryFilter(WarningCategory.STAFF)).toEqual({
      category: { $in: [WarningCategory.STAFF, null] },
    });
  });

  it("matches OWNER exactly — legacy rows are never owner warnings", () => {
    expect(categoryFilter(WarningCategory.OWNER)).toEqual({ category: WarningCategory.OWNER });
  });
});

describe("OTHER_CATEGORY", () => {
  it("is the opposite ladder", () => {
    expect(OTHER_CATEGORY[WarningCategory.STAFF]).toBe(WarningCategory.OWNER);
    expect(OTHER_CATEGORY[WarningCategory.OWNER]).toBe(WarningCategory.STAFF);
  });
});

describe("staff warns channel heading", () => {
  const args = { targetId: "u1", reason: "سبب", evidence: ["https://x/p.png"] };

  it("keeps the exact existing format for staff warnings", () => {
    const msg = formatStaffWarningMessage({ ...args, level: 1 });
    expect(msg.split("\n")[0]).toContain("**Staff Warn 1 ");
    expect(msg).toContain("**منشن : <@u1>**");
    expect(msg).toContain("**السبب : سبب**");
    expect(msg).toContain("**الدليل : https://x/p.png**");
  });

  it("only swaps the word for owner warnings — same channel, same shape", () => {
    const staff = formatStaffWarningMessage({ ...args, level: 2, category: "STAFF" });
    const owner = formatStaffWarningMessage({ ...args, level: 2, category: "OWNER" });
    expect(owner.split("\n")[0]).toContain("**Owner Warn 2 ");
    expect(owner.split("\n").slice(1)).toEqual(staff.split("\n").slice(1));
  });
});
