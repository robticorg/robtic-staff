import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../models/role-config.model.ts";
import { roleConfigService } from "../services/role-config.service.ts";
import { RoleConfigType } from "../types/enums.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";

let hasDb = false;
try {
  await mongoose.connect(config.mongoUri, {
    dbName: `${config.mongoDbName}_test`,
    serverSelectionTimeoutMS: 1500,
  });
  hasDb = true;
} catch {
  hasDb = false;
}

const GUILD = "role-identity-itest";
const MARKER = "r-staff-marker";
const LADDER = ["r-l0", "r-l1", "r-l2", "r-l3"];

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}
function member(roleIds: string[]) {
  const cache = new RoleCache();
  for (const r of roleIds) cache.set(r, { id: r });
  return {
    id: "u1",
    guild: { id: GUILD },
    permissions: { has: () => false },
    roles: { cache },
  } as never;
}

const setMarker = () =>
  roleConfigService.setRole({ guildId: GUILD, roleId: MARKER, type: RoleConfigType.STAFF });

describe.skipIf(!hasDb)("general @Staff marker vs numbered ladder rungs", () => {
  beforeEach(async () => {
    await RoleConfigModel.deleteMany({ guildId: GUILD });
  });

  afterAll(async () => {
    await RoleConfigModel.deleteMany({ guildId: GUILD });
  });

  /**
   * Regression: `rebuildLadder` stamps middle rungs with `type: STAFF`, the
   * same type as the general marker. `/role staff` used to treat that type as
   * a singleton and delete every other STAFF row — wiping the middle of the
   * ladder and silently un-staffing everyone holding those roles.
   */
  it("keeps the numbered ladder intact when /role staff runs afterwards", async () => {
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await setMarker();

    const levels = await roleConfigService.getStaffRoleLevels(GUILD);
    expect(levels.map((r) => r.level)).toEqual([0, 1, 2, 3]);
    expect(levels.map((r) => r.roleId)).toEqual(LADDER);
  });

  it("still replaces a previously configured general marker", async () => {
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await setMarker();
    await roleConfigService.setRole({
      guildId: GUILD,
      roleId: "r-new-marker",
      type: RoleConfigType.STAFF,
    });

    expect(await roleConfigService.getGeneralStaffRoleId(GUILD)).toBe("r-new-marker");
    // The old marker is gone, the ladder is untouched.
    expect(await RoleConfigModel.countDocuments({ guildId: GUILD, roleId: MARKER })).toBe(0);
    expect((await roleConfigService.getStaffRoleLevels(GUILD)).length).toBe(4);
  });

  it("resolves the general marker, never a numbered rung", async () => {
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await setMarker();

    expect(await roleConfigService.getGeneralStaffRoleId(GUILD)).toBe(MARKER);
    expect((await roleConfigService.getGeneralStaffRole(GUILD))?.roleId).toBe(MARKER);
  });

  it("treats a member holding only the general @Staff role as staff", async () => {
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await setMarker();

    // This is the exact case that produced "ما عندك صلاحية تستخدم هذا" on !warn.
    expect(await staffPermissionService.isStaff(member([MARKER]))).toBe(true);
  });

  it("treats a member holding only a middle ladder rung as staff", async () => {
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await setMarker();

    expect(await staffPermissionService.isStaff(member(["r-l1"]))).toBe(true);
    expect(await staffPermissionService.isStaff(member(["r-l2"]))).toBe(true);
  });

  it("gives the same answer regardless of configuration order", async () => {
    // Marker first, then ladder.
    await setMarker();
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    const first = [...(await staffPermissionService.staffRoleIds(GUILD))].sort();

    // Ladder first, then marker.
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await setMarker();
    const second = [...(await staffPermissionService.staffRoleIds(GUILD))].sort();

    expect(first).toEqual(second);
    expect(second).toEqual([MARKER, ...LADDER].sort());
  });

  it("still excludes non-staff members", async () => {
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await setMarker();

    expect(await staffPermissionService.isStaff(member(["r-community"]))).toBe(false);
    expect(await staffPermissionService.isStaff(member([]))).toBe(false);
  });

  it("keeps other singleton slots exclusive", async () => {
    await roleConfigService.setRole({
      guildId: GUILD,
      roleId: "r-bl-1",
      type: RoleConfigType.BLACKLIST,
    });
    await roleConfigService.setRole({
      guildId: GUILD,
      roleId: "r-bl-2",
      type: RoleConfigType.BLACKLIST,
    });

    const rows = await roleConfigService.listByType(GUILD, RoleConfigType.BLACKLIST);
    expect(rows.map((r) => r.roleId)).toEqual(["r-bl-2"]);
  });
});
