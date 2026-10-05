import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { splitHiddenMode } from "../../../../commands/prefix/_shared/hidden-mode.ts";
import { parseMoveArgs } from "../../../../commands/prefix/_shared/move-args.ts";
import { isHiddenRemoval } from "../../../../commands/prefix/staff/hidden.ts";
import { parseHiddenCustomId } from "../handlers/component-ids.ts";
import { buildHiddenLevelMenu } from "../render/level-menu.ts";
import { decideHiddenManagement } from "../services/hidden-staff-authorization.service.ts";
import {
  HiddenConfigProblem,
  buildHiddenHierarchy,
  hiddenRolePlan,
  hiddenRolesForLevel,
  highestHiddenLevel,
} from "../services/hidden-staff-hierarchy.ts";
import { decideHiddenSync } from "../services/hidden-staff-level-sync.service.ts";
import { decideHiddenVisibility } from "../services/hidden-staff-visibility.service.ts";
import { nextHiddenLevel } from "../services/hidden-staff.service.ts";

const EVERYONE = "guild";
const roles = [
  { id: EVERYONE, position: 0, name: "@everyone" },
  { id: "v", position: 10, name: "V" },
  { id: "spacer", position: 11, name: "Spacer" },
  { id: "iv", position: 12, name: "IV" },
  { id: "iii", position: 13, name: "III" },
  { id: "manager", position: 14, name: "Gift Manager" },
  { id: "ii", position: 15, name: "II" },
  { id: "bot", position: 16, name: "Bot", managed: true },
  { id: "i", position: 17, name: "I" },
  { id: "owner", position: 30, name: "Owner" },
];

const config = (over: Partial<{ start: string | null; end: string | null; ignored: string[] }> = {}) => ({
  hiddenStartRoleId: over.start === undefined ? "v" : over.start,
  hiddenEndRoleId: over.end === undefined ? "i" : over.end,
  hiddenIgnoredRoleIds: over.ignored ?? ["spacer"],
});

const build = (over: Parameters<typeof config>[0] = {}, excluded: string[] = ["manager"]) =>
  buildHiddenHierarchy({ roles, everyoneRoleId: EVERYONE, config: config(over), excludedRoleIds: excluded });

describe("hidden hierarchy", () => {
  it("orders V → I from the start role up, skipping ignored, configured and managed roles", () => {
    const hierarchy = build();
    expect(hierarchy.problem).toBeNull();
    expect(hierarchy.levels.map((rung) => [rung.name, rung.level])).toEqual([
      ["V", 1],
      ["IV", 2],
      ["III", 3],
      ["II", 4],
      ["I", 5],
    ]);
  });

  it("does not let ignored roles consume a level", () => {
    const withSpacer = build({ ignored: [] });
    expect(withSpacer.levels.map((rung) => rung.name)).toEqual(["V", "Spacer", "IV", "III", "II", "I"]);
    expect(build().levels.find((rung) => rung.name === "IV")?.level).toBe(2);
  });

  it("does not inherit the normal staff ignores", () => {
    expect(build({}, []).levels.map((rung) => rung.name)).toContain("Gift Manager");
  });

  it("reports invalid configurations", () => {
    expect(build({ start: null }).problem).toBe(HiddenConfigProblem.NOT_CONFIGURED);
    expect(build({ start: "missing" }).problem).toBe(HiddenConfigProblem.START_MISSING);
    expect(build({ end: "missing" }).problem).toBe(HiddenConfigProblem.END_MISSING);
    expect(build({ start: "i", end: "v" }).problem).toBe(HiddenConfigProblem.END_BELOW_START);
    expect(build({ ignored: ["v"] }).problem).toBe(HiddenConfigProblem.START_IGNORED);
    expect(build({ ignored: ["i"] }).problem).toBe(HiddenConfigProblem.END_IGNORED);
  });

  it("gives every role up to the chosen level and removes only the hidden roles above it", () => {
    const hierarchy = build();
    expect(hiddenRolePlan(hierarchy, 3)).toEqual({ add: ["v", "iv", "iii"], remove: ["ii", "i"] });
    expect(hiddenRolesForLevel(hierarchy, 1)).toEqual(["v"]);
    expect(hiddenRolePlan(hierarchy, 0)).toEqual({ add: [], remove: ["v", "iv", "iii", "ii", "i"] });
  });

  it("reads the level from roles, ignoring unrelated ones", () => {
    const hierarchy = build();
    expect(highestHiddenLevel(hierarchy, ["owner", "manager", "v", "iv", "iii"])).toBe(3);
    expect(highestHiddenLevel(hierarchy, ["owner", "manager"])).toBe(0);
  });
});

describe("hidden promotion and demotion steps", () => {
  it("promotes V → IV → III → II → I and stops at I", () => {
    expect([1, 2, 3, 4].map((level) => nextHiddenLevel(level, 5, "promote"))).toEqual([2, 3, 4, 5]);
    expect(nextHiddenLevel(5, 5, "promote")).toBeNull();
  });

  it("demotes I → II → III → IV → V and never removes Hidden Staff", () => {
    expect([5, 4, 3, 2].map((level) => nextHiddenLevel(level, 5, "demote"))).toEqual([4, 3, 2, 1]);
    expect(nextHiddenLevel(1, 5, "demote")).toBeNull();
  });

  it("does nothing for someone who is not hidden", () => {
    expect(nextHiddenLevel(0, 5, "promote")).toBeNull();
  });
});

describe("hidden authorization", () => {
  it("only an administrator manages a hidden target", () => {
    expect(decideHiddenManagement({ actorIsAdministrator: true, targetIsHidden: true })).toBe(true);
    expect(decideHiddenManagement({ actorIsAdministrator: false, targetIsHidden: true })).toBe(false);
  });

  it("leaves normal staff to the existing rules", () => {
    expect(decideHiddenManagement({ actorIsAdministrator: false, targetIsHidden: false })).toBe(true);
  });
});

describe("hidden visibility", () => {
  const facts = (over: Partial<Parameters<typeof decideHiddenVisibility>[0]> = {}) =>
    decideHiddenVisibility({
      isSelf: false,
      viewerIsAdministrator: false,
      targetIsHidden: true,
      viewerHiddenLevel: 0,
      targetHiddenLevel: 3,
      ...over,
    });

  it("lets the member themselves and administrators see", () => {
    expect(facts({ isSelf: true })).toBe(true);
    expect(facts({ viewerIsAdministrator: true })).toBe(true);
  });

  it("lets a higher hidden level see a lower one, not the same or lower", () => {
    expect(facts({ viewerHiddenLevel: 4 })).toBe(true);
    expect(facts({ viewerHiddenLevel: 3 })).toBe(false);
    expect(facts({ viewerHiddenLevel: 1 })).toBe(false);
  });

  it("hides from everyone else, including normal staff managers", () => {
    expect(facts()).toBe(false);
  });

  it("does not restrict normal staff", () => {
    expect(facts({ targetIsHidden: false })).toBe(true);
  });
});

describe("hidden level sync", () => {
  it("follows Discord roles and never trusts a stale database level", () => {
    expect(decideHiddenSync(3, null)).toBe("ACTIVATED");
    expect(decideHiddenSync(3, { active: false, currentLevel: 0 })).toBe("ACTIVATED");
    expect(decideHiddenSync(3, { active: true, currentLevel: 2 })).toBe("LEVEL_CHANGED");
    expect(decideHiddenSync(3, { active: true, currentLevel: 3 })).toBe("UNCHANGED");
    expect(decideHiddenSync(0, { active: true, currentLevel: 3 })).toBe("DEACTIVATED");
    expect(decideHiddenSync(0, null)).toBe("UNCHANGED");
  });
});

describe("hidden command parsing", () => {
  it("reads hidden mode from all four keywords", () => {
    for (const keyword of ["hidden", "starter", "مخفية", "ستريتر", "HIDDEN"]) {
      expect(splitHiddenMode(["<@1>", keyword])).toEqual({ hidden: true, args: ["<@1>"] });
    }
  });

  it("does not confuse hidden mode with max, levels, tiers or staff types", () => {
    for (const token of ["max", "ماكس", "3", "owner", "dev"]) {
      expect(splitHiddenMode(["<@1>", token]).hidden).toBe(false);
    }
    expect(parseMoveArgs(["<@1>", "max"]).max).toBe(true);
    expect(parseMoveArgs(["<@1>", "3"]).amount).toBe(3);
  });

  it("reads every removal form", () => {
    for (const args of [["remove", "<@1>"], ["ازالة", "<@1>"], ["<@1>", "ازالة"], ["<@1>", "إزالة"]]) {
      expect(isHiddenRemoval(args)).toBe(true);
    }
    expect(isHiddenRemoval(["<@1>"])).toBe(false);
  });
});

describe("hidden level menu", () => {
  type Json = { type: number; custom_id?: string; options?: { label: string; value: string }[]; components?: Json[] };
  const flat = (n: Json): Json[] => [n, ...(n.components ?? []).flatMap(flat)];

  it("lists every configured hidden level for the command author", () => {
    const menu = buildHiddenLevelMenu("admin", "target", build().levels);
    const nodes = (menu.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
    const select = nodes.find((n) => n.type === 3)!;
    expect(parseHiddenCustomId(select.custom_id!)).toEqual({ action: "set", args: ["admin", "target"] });
    expect(select.options!.map((o) => [o.label, o.value])).toEqual([
      ["V", "1"],
      ["IV", "2"],
      ["III", "3"],
      ["II", "4"],
      ["I", "5"],
    ]);
  });
});
