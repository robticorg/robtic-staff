import { describe, expect, it } from "bun:test";
import { ModalBuilder } from "discord.js";
import { parseResponsibleArgs } from "../../../commands/prefix/_shared/responsible-args.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { buildAddResponsibilityModal } from "../render/add-modal.ts";
import { buildAssignMenu, buildCategoryMenu, buildRemoveMenu, sortByCategory } from "../render/menus.ts";
import { decideCanAssign } from "../services/responsibility-authorization.service.ts";
import { parseResponsibilityDuration } from "../shared/duration.ts";
import { ResponsibilityCategory } from "../types/enums.ts";

const USER = "123456789012345678";
const MENTION = `<@${USER}>`;

const decide = (
  held: string[],
  permission: string,
  extra: Partial<{ isAdministrator: boolean; isSelf: boolean }> = {},
) =>
  decideCanAssign({
    isAdministrator: extra.isAdministrator ?? false,
    isSelf: extra.isSelf ?? false,
    heldPermissions: new Set(held),
    permission,
  });

describe("decideCanAssign", () => {
  it("lets administrators assign anything, including to themselves", () => {
    expect(decide([], RoleConfigType.OWNER_MANAGER, { isAdministrator: true })).toBe(true);
    expect(decide([], RoleConfigType.STAFF_MANAGER, { isAdministrator: true, isSelf: true })).toBe(true);
  });

  it("lets the owner manager assign the staff manager and departments", () => {
    expect(decide([RoleConfigType.OWNER_MANAGER], RoleConfigType.STAFF_MANAGER)).toBe(true);
    expect(decide([RoleConfigType.OWNER_MANAGER], RoleConfigType.CHAT_MANAGER)).toBe(true);
  });

  it("keeps the staff manager to department permissions", () => {
    expect(decide([RoleConfigType.STAFF_MANAGER], RoleConfigType.CHAT_MANAGER)).toBe(true);
    expect(decide([RoleConfigType.STAFF_MANAGER], RoleConfigType.STAFF_MANAGER)).toBe(false);
    expect(decide([RoleConfigType.STAFF_MANAGER], RoleConfigType.OWNER_MANAGER)).toBe(false);
  });

  it("denies self assignment and members without an assigner permission", () => {
    expect(decide([RoleConfigType.OWNER_MANAGER], RoleConfigType.CHAT_MANAGER, { isSelf: true })).toBe(false);
    expect(decide([RoleConfigType.CHAT_MANAGER], RoleConfigType.CHAT_MANAGER)).toBe(false);
    expect(decide([], RoleConfigType.CHAT_MANAGER)).toBe(false);
  });
});

describe("parseResponsibleArgs", () => {
  it("reads the assign form", () => {
    expect(parseResponsibleArgs([MENTION])).toEqual({ remove: false, targetId: USER });
  });

  it("reads all four remove forms", () => {
    const forms = [
      ["ازالة", MENTION],
      [MENTION, "ازالة"],
      ["remove", MENTION],
      [MENTION, "remove"],
    ];
    for (const args of forms) {
      expect(parseResponsibleArgs(args)).toEqual({ remove: true, targetId: USER });
    }
    expect(parseResponsibleArgs(["إزالة", MENTION]).remove).toBe(true);
    expect(parseResponsibleArgs(["REMOVE", MENTION]).remove).toBe(true);
  });

  it("reads حذف and delete as remove too", () => {
    for (const args of [["حذف", MENTION], [MENTION, "حذف"], ["delete", MENTION], [MENTION, "DELETE"]]) {
      expect(parseResponsibleArgs(args)).toEqual({ remove: true, targetId: USER });
    }
  });

  it("returns no target without a mention", () => {
    expect(parseResponsibleArgs([]).targetId).toBeNull();
  });
});

describe("parseResponsibilityDuration", () => {
  it("parses durations with units", () => {
    expect(parseResponsibilityDuration("7d")).toBe(7 * 86_400_000);
    expect(parseResponsibilityDuration("1d 12h")).toBe(36 * 3_600_000);
  });

  it("rejects bare numbers, junk, zero and anything over the maximum", () => {
    expect(parseResponsibilityDuration("7")).toBeNull();
    expect(parseResponsibilityDuration("abc")).toBeNull();
    expect(parseResponsibilityDuration("0d")).toBeNull();
    expect(parseResponsibilityDuration("400d")).toBeNull();
  });
});

const row = (id: string, title: string, category: ResponsibilityCategory) => ({
  responsibilityId: id,
  title,
  description: "وصف",
  category,
});

const toJson = (component: unknown) => (component as { toJSON(): unknown }).toJSON();

describe("responsibility rendering", () => {
  it("sorts by category order, then title", () => {
    const sorted = sortByCategory([
      row("a", "ب", ResponsibilityCategory.OTHER),
      row("b", "ا", ResponsibilityCategory.STAFF),
      row("c", "ب", ResponsibilityCategory.STAFF),
    ]);
    expect(sorted.map((r) => r.responsibilityId)).toEqual(["b", "c", "a"]);
  });

  it("builds valid assign, remove and category menus capped at 25 options", () => {
    const many = Array.from({ length: 30 }, (_, i) => row(`r${i}`, `عنوان ${i}`, ResponsibilityCategory.OTHER));
    const assign = buildAssignMenu("1", "2", many);
    const remove = buildRemoveMenu("1", "2", [{ assignmentId: "x", responsibility: many[0]! }]);
    const category = buildCategoryMenu("r0", "اختر");
    for (const message of [assign, remove, category]) {
      for (const component of message.components ?? []) expect(() => toJson(component)).not.toThrow();
    }
    const json = JSON.stringify(toJson(assign.components![0]));
    expect((json.match(/"value":"r\d+"/g) ?? []).length).toBe(25);
  });

  it("builds a valid add modal", () => {
    const modal = buildAddResponsibilityModal();
    expect(modal).toBeInstanceOf(ModalBuilder);
    expect(() => modal.toJSON()).not.toThrow();
  });
});
