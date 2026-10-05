import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { PermissionFlagsBits, type Guild, type GuildMember } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../../config/index.ts";
import { StaffHistoryModel } from "../../models/staff-history.model.ts";
import { StaffModel } from "../../models/staff.model.ts";
import { StaffHistoryAction, StaffStatus } from "../../types/enums.ts";
import { HiddenStaffConfigModel } from "../models/hidden-staff-config.model.ts";
import { HiddenStaffModel } from "../models/hidden-staff.model.ts";
import { hiddenStaffConfigRepository } from "../repositories/hidden-staff-config.repository.ts";
import { hiddenStaffHierarchyService } from "../services/hidden-staff-hierarchy.service.ts";
import { hiddenStaffLevelSyncService } from "../services/hidden-staff-level-sync.service.ts";
import { hiddenStaffService } from "../services/hidden-staff.service.ts";
import { hiddenStaffVisibilityService } from "../services/hidden-staff-visibility.service.ts";

let hasDb = false;
try {
  await mongoose.connect(config.mongoUri, { dbName: `${config.mongoDbName}_test`, serverSelectionTimeoutMS: 1500 });
  hasDb = true;
} catch {
  hasDb = false;
}

const GUILD = "hidden-itest-guild";
const HIDDEN = ["h5", "h4", "h3", "h2", "h1"];
const UNRELATED = ["owner-role", "staff-manager-role", "gift-manager-role", "access-role", "assign-role", "random-role"];

function fakeGuild(): Guild {
  const roleCache = new Map<string, { id: string; position: number; managed: boolean; name: string }>();
  HIDDEN.forEach((id, i) => roleCache.set(id, { id, position: 10 + i, managed: false, name: id.toUpperCase() }));
  UNRELATED.forEach((id, i) => roleCache.set(id, { id, position: 40 + i, managed: false, name: id }));
  const guild = { id: GUILD, roles: { cache: roleCache }, members: { fetch: async () => null } };
  return guild as unknown as Guild;
}

function fakeMember(guild: Guild, id: string, roleIds: string[], admin = false): GuildMember {
  const cache = new Map(roleIds.map((roleId) => [roleId, { id: roleId }]));
  return {
    id,
    guild,
    permissions: { has: (flag: bigint) => admin && flag === PermissionFlagsBits.Administrator },
    roles: {
      cache,
      add: async (ids: string[]) => ids.forEach((roleId) => cache.set(roleId, { id: roleId })),
      remove: async (ids: string[]) => ids.forEach((roleId) => cache.delete(roleId)),
    },
  } as unknown as GuildMember;
}

const roleIdsOf = (member: GuildMember) => [...member.roles.cache.keys()].sort();

async function cleanup() {
  await Promise.all([
    HiddenStaffModel.deleteMany({ guildId: GUILD }),
    HiddenStaffConfigModel.deleteMany({ guildId: GUILD }),
    StaffModel.deleteMany({ guildId: GUILD }),
  ]);
}

describe.skipIf(!hasDb)("hidden staff (MongoDB + Discord fakes)", () => {
  let guild: Guild;
  let admin: GuildMember;
  let manager: GuildMember;

  beforeEach(async () => {
    await cleanup();
    guild = fakeGuild();
    hiddenStaffHierarchyService.invalidate(GUILD);
    await hiddenStaffConfigRepository.save(GUILD, { hiddenStartRoleId: "h5", hiddenEndRoleId: "h1", hiddenIgnoredRoleIds: [] });
    admin = fakeMember(guild, "admin", [], true);
    manager = fakeMember(guild, "manager", ["staff-manager-role"]);
  });

  afterAll(async () => {
    if (!hasDb) return;
    await cleanup();
    await mongoose.disconnect();
  });

  async function staffMember(id: string, roles: string[]) {
    const staff = await StaffModel.create({ guildId: GUILD, userId: id, status: StaffStatus.BREAK, currentRoleLevel: 3 });
    return { member: fakeMember(guild, id, roles), staff };
  }

  it("sets a level, keeps every unrelated role, and records HIDDEN_ACCEPT", async () => {
    const { member, staff } = await staffMember("u1", [...UNRELATED]);
    await hiddenStaffService.setLevel(admin, member, 3);
    expect(roleIdsOf(member)).toEqual([...UNRELATED, "h5", "h4", "h3"].sort());

    await hiddenStaffService.setLevel(admin, member, 1);
    expect(roleIdsOf(member)).toEqual([...UNRELATED, "h5"].sort());

    const actions = (await StaffHistoryModel.find({ staffId: staff._id }).sort({ createdAt: 1 }).exec()).map((h) => h.action);
    expect(actions).toEqual([StaffHistoryAction.HIDDEN_ACCEPT, StaffHistoryAction.HIDDEN_DEMOTE]);
    expect((await StaffModel.findById(staff._id).exec())!.currentRoleLevel).toBe(3);
  });

  it("refuses non-administrators, including staff managers", async () => {
    const { member } = await staffMember("u2", []);
    await expect(hiddenStaffService.setLevel(manager, member, 1)).rejects.toThrow();
    await expect(hiddenStaffService.move(manager, member, "promote")).rejects.toThrow();
    await expect(hiddenStaffService.remove(manager, member)).rejects.toThrow();
    expect(roleIdsOf(member)).toEqual([]);
  });

  it("promotes one level at a time and stops at the top", async () => {
    const { member } = await staffMember("u3", ["owner-role"]);
    await hiddenStaffService.grantFirstLevel(member, "admin");
    expect(roleIdsOf(member)).toEqual(["h5", "owner-role"].sort());
    for (let i = 0; i < 4; i += 1) expect((await hiddenStaffService.move(admin, member, "promote")).kind).toBe("MOVED");
    expect(roleIdsOf(member)).toEqual([...HIDDEN, "owner-role"].sort());
    expect((await hiddenStaffService.move(admin, member, "promote")).kind).toBe("AT_LIMIT");
  });

  it("demotes down to the first level and never removes Hidden Staff", async () => {
    const { member } = await staffMember("u4", ["gift-manager-role"]);
    await hiddenStaffService.setLevel(admin, member, 2);
    expect((await hiddenStaffService.move(admin, member, "demote")).kind).toBe("MOVED");
    expect((await hiddenStaffService.move(admin, member, "demote")).kind).toBe("AT_LIMIT");
    expect(roleIdsOf(member)).toEqual(["gift-manager-role", "h5"].sort());
    expect((await HiddenStaffModel.findOne({ guildId: GUILD, userId: "u4" }).exec())!.active).toBe(true);
  });

  it("removes only the hidden roles and records HIDDEN_REMOVE", async () => {
    const { member, staff } = await staffMember("u5", [...UNRELATED]);
    await hiddenStaffService.setLevel(admin, member, 4);
    await hiddenStaffService.remove(admin, member);
    expect(roleIdsOf(member)).toEqual([...UNRELATED].sort());
    expect((await HiddenStaffModel.findOne({ guildId: GUILD, userId: "u5" }).exec())!.active).toBe(false);
    const last = await StaffHistoryModel.findOne({ staffId: staff._id }).sort({ createdAt: -1 }).exec();
    expect(last!.action).toBe(StaffHistoryAction.HIDDEN_REMOVE);
  });

  it("syncs the database from roles without writing history", async () => {
    const { member, staff } = await staffMember("u6", ["h5", "h4"]);
    expect(await hiddenStaffLevelSyncService.syncMember(member)).toBe("ACTIVATED");
    expect((await HiddenStaffModel.findOne({ guildId: GUILD, userId: "u6" }).exec())!.currentLevel).toBe(2);
    await member.roles.remove(["h4", "h5"]);
    expect(await hiddenStaffLevelSyncService.syncMember(member)).toBe("DEACTIVATED");
    expect(await StaffHistoryModel.countDocuments({ staffId: staff._id })).toBe(0);
  });

  it("hides stats from other members but not from the member, a higher hidden member or an administrator", async () => {
    const { member: target } = await staffMember("u7", ["h5", "h4"]);
    const normal = fakeMember(guild, "viewer", []);
    const higher = fakeMember(guild, "higher", ["h5", "h4", "h3"]);
    (guild.members as unknown as { fetch: (id: string) => Promise<GuildMember | null> }).fetch = async (id: string) =>
      id === "u7" ? target : null;

    expect(await hiddenStaffVisibilityService.canViewHiddenStats(normal, "u7")).toBe(false);
    expect(await hiddenStaffVisibilityService.canViewHiddenStats(manager, "u7")).toBe(false);
    expect(await hiddenStaffVisibilityService.canViewHiddenStats(higher, "u7")).toBe(true);
    expect(await hiddenStaffVisibilityService.canViewHiddenStats(admin, "u7")).toBe(true);
    expect(await hiddenStaffVisibilityService.canViewHiddenStats(target, "u7")).toBe(true);
  });
});
