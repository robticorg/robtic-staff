import { describe, expect, it } from "bun:test";
import { PermissionFlagsBits, type ContainerBuilder } from "discord.js";
import { buildStaffInfoPanel } from "../render/panel.ts";
import { canOpenInfo } from "../services/staff-info-access.ts";

const member = (roles: string[], admin = false) => ({
  permissions: { has: (flag: bigint) => admin && flag === PermissionFlagsBits.Administrator },
  roles: { cache: new Set(roles) },
});

describe("canOpenInfo", () => {
  it("lets everyone open an info without an access role", () => {
    expect(canOpenInfo(member([]), { accessRoleId: null })).toBe(true);
    expect(canOpenInfo(member([]), {})).toBe(true);
  });

  it("only lets holders of the access role open a locked info", () => {
    const info = { accessRoleId: "managers" };
    expect(canOpenInfo(member(["managers"]), info)).toBe(true);
    expect(canOpenInfo(member(["staff"]), info)).toBe(false);
  });

  it("always lets administrators in", () => {
    expect(canOpenInfo(member([], true), { accessRoleId: "managers" })).toBe(true);
  });
});

describe("panel lock marker", () => {
  it("puts a 🔒 only on locked infos", () => {
    const [container] = (
      buildStaffInfoPanel([
        { infoId: "a", name: "Open", description: "d" },
        { infoId: "b", name: "Locked", description: "d", locked: true },
      ]).components as ContainerBuilder[]
    ).map((c) => c.toJSON() as unknown as { components: { components?: { options?: { emoji?: { name?: string } }[] }[] }[] });

    const options = container!.components
      .flatMap((c) => c.components ?? [])
      .flatMap((c) => c.options ?? []);
    expect(options.map((o) => o.emoji?.name ?? null)).toEqual([null, "🔒"]);
  });
});
