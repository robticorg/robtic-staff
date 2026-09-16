import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../models/role-config.model.ts";
import { roleConfigService } from "../services/role-config.service.ts";
import {
  AccessRoleRejection,
  staffAccessRoleService as access,
} from "../services/staff-access-role.service.ts";
import { RoleConfigType } from "../types/enums.ts";
import {
  getAccessRoles,
  getHierarchy,
  highestLevelFromRoleIds,
  invalidateStaffHierarchy,
  isAccessRole,
  isStaffRelatedRole,
} from "../utils/staff-levels.ts";
import { captureStaffRoleSnapshot } from "../../staff/services/staff-role-snapshot.ts";

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

const GUILD = "access-itest-guild";
const OTHER_GUILD = "access-itest-other";
const MARKER = "r-staff-marker";
const LADDER = ["r-l0", "r-l1", "r-l2", "r-l3"];

const POSITIONS: Record<string, number> = {
  "r-community": 1,
  "r-a": 2,
  "r-b": 3,
  "r-c": 4,
  "r-d": 5,
  "r-top": 6,
  "r-managed": 7,
  [MARKER]: 8,
  "r-l0": 9,
  "r-l1": 10,
  "r-l2": 11,
  "r-l3": 12,
};

class RoleCache extends Map<string, FakeRole> {
  some(fn: (v: FakeRole) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}
interface FakeRole {
  id: string;
  position: number;
  managed: boolean;
}

function makeGuild(id = GUILD, botPosition = 100) {
  const cache = new RoleCache();
  for (const [roleId, position] of Object.entries(POSITIONS)) {
    cache.set(roleId, { id: roleId, position, managed: roleId === "r-managed" });
  }
  cache.set(id, { id, position: 0, managed: false });
  return {
    id,
    roles: { cache },
    members: {
      me: {
        roles: {
          highest: {
            comparePositionTo: (role: FakeRole) => botPosition - role.position,
          },
        },
      },
    },
  };
}

function memberWith(guild: ReturnType<typeof makeGuild>, roleIds: string[]) {
  const cache = new RoleCache();
  for (const r of roleIds) cache.set(r, guild.roles.cache.get(r) ?? { id: r, position: 0, managed: false });
  return { id: "u1", guild, roles: { cache } } as never;
}

const role = (guild: ReturnType<typeof makeGuild>, id: string) => guild.roles.cache.get(id) as never;

async function seedLadder(guildId = GUILD): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId });
  await roleConfigService.rebuildLadder(guildId, LADDER);
  await roleConfigService.setRole({ guildId, roleId: MARKER, type: RoleConfigType.STAFF });
  invalidateStaffHierarchy(guildId);
}

describe.skipIf(!hasDb)("Staff Access Roles", () => {
  let guild: ReturnType<typeof makeGuild>;

  beforeEach(async () => {
    guild = makeGuild();
    await seedLadder();
  });

  afterAll(async () => {
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await RoleConfigModel.deleteMany({ guildId: OTHER_GUILD });
  });

  it("adds a single role without giving it a level", async () => {
    const result = await access.addAccessRole(guild as never, role(guild, "r-a"));

    expect(result.added).toEqual(["r-a"]);
    const row = await roleConfigService.get(GUILD, "r-a");
    expect(row!.type).toBe(RoleConfigType.ACCESS);
    expect(row!.level).toBeUndefined();
    expect(await roleConfigService.getStaffLevel(GUILD, "r-a")).toBeNull();
  });

  it("adds an inclusive range by Discord position", async () => {
    const result = await access.addAccessRoleRange(guild as never, "r-a", "r-d");

    expect(result.added.sort()).toEqual(["r-a", "r-b", "r-c", "r-d"]);
  });

  it("resolves the range regardless of argument order", async () => {
    const forward = access.resolveRoleRange(guild as never, "r-a", "r-d").map((r) => r.id);
    const backward = access.resolveRoleRange(guild as never, "r-d", "r-a").map((r) => r.id);
    expect(backward).toEqual(forward);
  });

  it("deduplicates a range combined with a single role", async () => {
    const roles = [
      ...access.resolveRoleRange(guild as never, "r-a", "r-c"),
      role(guild, "r-b"),
      role(guild, "r-top"),
    ];
    const result = await access.addAccessRoles(guild as never, roles as never);

    expect(result.added.sort()).toEqual(["r-a", "r-b", "r-c", "r-top"]);
  });

  it("never leaves the ladder or ignored roles modified", async () => {
    await access.addAccessRoleRange(guild as never, "r-a", "r-d");

    const levels = await roleConfigService.getStaffRoleLevels(GUILD);
    expect(levels.map((r) => r.roleId)).toEqual(LADDER);
    expect(await roleConfigService.getGeneralStaffRoleId(GUILD)).toBe(MARKER);
  });

  it("refuses @everyone, managed roles and roles above the bot", async () => {
    const lowBot = makeGuild(GUILD, 3);
    const result = await access.addAccessRoles(lowBot as never, [
      role(lowBot, GUILD),
      role(lowBot, "r-managed"),
      role(lowBot, "r-d"),
      role(lowBot, "r-a"),
    ] as never);

    const reasons = Object.fromEntries(result.rejected.map((r) => [r.roleId, r.reason]));
    expect(reasons[GUILD]).toBe(AccessRoleRejection.EVERYONE);
    expect(reasons["r-managed"]).toBe(AccessRoleRejection.MANAGED);
    expect(reasons["r-d"]).toBe(AccessRoleRejection.UNMANAGEABLE);
    expect(result.added).toEqual(["r-a"]);
  });

  it("reports a duplicate instead of adding it twice", async () => {
    await access.addAccessRole(guild as never, role(guild, "r-a"));
    const second = await access.addAccessRole(guild as never, role(guild, "r-a"));

    expect(second.added).toEqual([]);
    expect(second.rejected[0]!.reason).toBe(AccessRoleRejection.ALREADY_CONFIGURED);
    expect(await RoleConfigModel.countDocuments({ guildId: GUILD, roleId: "r-a" })).toBe(1);
  });

  it("refuses a role that already fills another Staff slot", async () => {
    const result = await access.addAccessRoles(guild as never, [
      role(guild, "r-l1"),
      role(guild, MARKER),
    ] as never);

    expect(result.added).toEqual([]);
    expect(result.rejected.map((r) => r.reason)).toEqual([
      AccessRoleRejection.RESERVED,
      AccessRoleRejection.RESERVED,
    ]);

    const levels = await roleConfigService.getStaffRoleLevels(GUILD);
    expect(levels.map((r) => r.level)).toEqual([0, 1, 2, 3]);
    expect((await roleConfigService.get(GUILD, "r-l1"))!.type).toBe(RoleConfigType.STAFF);
  });

  it("exposes access roles through the hierarchy service", async () => {
    await access.addAccessRoleRange(guild as never, "r-a", "r-b");

    expect((await getAccessRoles(GUILD)).sort()).toEqual(["r-a", "r-b"]);
    expect(await isAccessRole("r-a", GUILD)).toBe(true);
    expect(await isAccessRole("r-l1", GUILD)).toBe(false);

    expect(await isStaffRelatedRole("r-a", GUILD)).toBe(true);
    expect(await isStaffRelatedRole("r-l1", GUILD)).toBe(true);
    expect(await isStaffRelatedRole(MARKER, GUILD)).toBe(true);
    expect(await isStaffRelatedRole("r-community", GUILD)).toBe(false);
  });

  it("never lets access roles change the calculated Staff level", async () => {
    await access.addAccessRoleRange(guild as never, "r-a", "r-d");
    const hierarchy = await getHierarchy(GUILD);

    const held = [MARKER, "r-l3", "r-a", "r-b", "r-c", "r-d"];
    expect(highestLevelFromRoleIds(hierarchy, held)).toBe(3);
  });

  it("isolates configuration per guild", async () => {
    await seedLadder(OTHER_GUILD);
    await access.addAccessRole(guild as never, role(guild, "r-a"));

    expect(await getAccessRoles(GUILD)).toEqual(["r-a"]);
    expect(await getAccessRoles(OTHER_GUILD)).toEqual([]);
  });

  it("invalidates the hierarchy cache when configuration changes", async () => {
    expect(await getAccessRoles(GUILD)).toEqual([]);

    await access.addAccessRole(guild as never, role(guild, "r-a"));

    expect(await getAccessRoles(GUILD)).toEqual(["r-a"]);

    await access.removeAccessRole(GUILD, "r-a");
    expect(await getAccessRoles(GUILD)).toEqual([]);
  });

  it("removes access roles without touching the ladder", async () => {
    await access.addAccessRoleRange(guild as never, "r-a", "r-c");
    const removed = await access.removeAccessRoles(GUILD, ["r-a", "r-b"]);

    expect(removed).toBe(2);
    expect(await getAccessRoles(GUILD)).toEqual(["r-c"]);
    expect((await roleConfigService.getStaffRoleLevels(GUILD)).length).toBe(4);
  });

  it("captures staff and access roles into separate lists", async () => {
    await access.addAccessRoleRange(guild as never, "r-a", "r-d");
    const member = memberWith(guild, [MARKER, "r-l0", "r-l1", "r-a", "r-c", "r-community"]);

    const snapshot = await captureStaffRoleSnapshot(member, GUILD);

    expect(snapshot.staffRoleIds.sort()).toEqual([MARKER, "r-l0", "r-l1"].sort());
    expect(snapshot.accessRoleIds.sort()).toEqual(["r-a", "r-c"]);
    expect(snapshot.currentRoleLevel).toBe(1);

    expect(snapshot.staffRoleIds).not.toContain("r-community");
    expect(snapshot.accessRoleIds).not.toContain("r-community");
  });

  it("captures only the access roles the member actually holds", async () => {
    await access.addAccessRoleRange(guild as never, "r-a", "r-d");
    const member = memberWith(guild, [MARKER, "r-l0", "r-b"]);

    const snapshot = await captureStaffRoleSnapshot(member, GUILD);

    expect(snapshot.accessRoleIds).toEqual(["r-b"]);
  });
});
