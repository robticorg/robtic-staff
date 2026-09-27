import { describe, expect, it } from "bun:test";
import {
  ROLE_RANGE_CHOICES,
  ROLE_RANGE_SLOTS,
  ROLE_SET_CHOICES,
  ROLE_SET_SLOTS,
  ROLE_SLOT_LABELS,
} from "../../data/roles/index.ts";
import {
  ROLE_CONFIG_TYPE_VALUES,
  RoleConfigType,
} from "../../modules/configuration/types/enums.ts";
import roleCommand from "../role/index.ts";

const DISCORD_MAX_CHOICES = 25;

/** Slots that `/role` reaches through their own subcommand, not `set` / `range`. */
const OWN_SUBCOMMAND: readonly RoleConfigType[] = [RoleConfigType.STAFF_TYPE];

describe("/role slot tables", () => {
  it("routes every RoleConfigType somewhere", () => {
    const reachable = new Set<string>([
      ...ROLE_SET_SLOTS,
      ...ROLE_RANGE_SLOTS,
      ...OWN_SUBCOMMAND,
    ]);
    const orphans = ROLE_CONFIG_TYPE_VALUES.filter((type) => !reachable.has(type));
    expect(orphans).toEqual([]);
  });

  it("never routes one slot through two subcommands", () => {
    const all = [...ROLE_SET_SLOTS, ...ROLE_RANGE_SLOTS, ...OWN_SUBCOMMAND];
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives every choice a label", () => {
    for (const choice of [...ROLE_SET_CHOICES, ...ROLE_RANGE_CHOICES]) {
      expect(choice.name).toBe(ROLE_SLOT_LABELS[choice.value as RoleConfigType]);
      expect(choice.name.length).toBeGreaterThan(0);
    }
  });

  it("keeps the range choices under the 25-choice cap", () => {
    expect(ROLE_RANGE_CHOICES.length).toBeLessThan(DISCORD_MAX_CHOICES);
  });

  it("serves the set slots through autocomplete, so their count is not capped", () => {
    const json = roleCommand.data.toJSON() as unknown as {
      options?: { name: string; options?: { name: string; autocomplete?: boolean; choices?: unknown[] }[] }[];
    };
    const type = json.options?.find((s) => s.name === "set")?.options?.find((o) => o.name === "type");
    expect(type?.autocomplete).toBe(true);
    expect(type?.choices ?? []).toEqual([]);
    expect(ROLE_SET_CHOICES.length).toBeGreaterThan(0);
  });
});

describe("/role subcommand surface", () => {
  const json = roleCommand.data.toJSON() as unknown as {
    options?: { name: string; options?: { name: string; required?: boolean }[] }[];
  };
  const subs = json.options ?? [];

  it("is down to the six that cover everything", () => {
    expect(subs.map((s) => s.name).sort()).toEqual([
      "boundary",
      "check",
      "list",
      "range",
      "set",
      "stafftype",
    ]);
  });

  it("leaves room under the 25-subcommand cap", () => {
    expect(subs.length).toBeLessThan(25);
  });

  it("requires type and role on set, and only type on range", () => {
    const required = (name: string) =>
      (subs.find((s) => s.name === name)?.options ?? [])
        .filter((o) => o.required)
        .map((o) => o.name);

    expect(required("set")).toEqual(["type", "role"]);
    expect(required("range")).toEqual(["type"]);
  });
});
