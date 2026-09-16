import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { ChannelType } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { ChannelConfigModel } from "../../configuration/models/channel-config.model.ts";
import { ChannelConfigType, RoleConfigType } from "../../configuration/types/enums.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { StaffTagRestrictionModel } from "../models/staff-tag-restriction.model.ts";
import {
  StaffTagRestorationReason,
  StaffTagRestrictionStatus,
} from "../types/enums.ts";
import { attachServerTagClient } from "../runtime.ts";
import { serverTagService } from "../services/server-tag.service.ts";
import { serverTagExpirationService } from "../services/server-tag-expiration.service.ts";
import { staffTagRestrictionService } from "../services/staff-tag-restriction.service.ts";
import { serverTagHandler } from "../handlers/server-tag.handler.ts";

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

const GUILD = "tag-itest-guild";
const OTHER_GUILD = "tag-itest-other-guild";

const R_START = "r-start";
const R_END = "r-end";
const R_STAFF = "r-staff-general";
const R_MANAGER = "r-staff-manager";
const R_WARN1 = "r-staff-warn-1";
const R_TAG = "r-tag";
const R_BLACKLIST = "r-blacklist";
const R_COMMUNITY = "r-community";
const LOG_CHANNEL = "chan-tag-log";

const ALL_ROLES = [
  R_START,
  R_END,
  R_STAFF,
  R_MANAGER,
  R_WARN1,
  R_TAG,
  R_BLACKLIST,
  R_COMMUNITY,
];

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

interface FakeMember {
  id: string;
  guild: FakeGuild;
  user: { id: string; primaryGuild: unknown };
  permissions: { has: () => boolean };
  roles: {
    cache: RoleCache;
    add: (ids: string | string[]) => Promise<void>;
    remove: (ids: string | string[]) => Promise<void>;
  };
}

interface FakeGuild {
  id: string;
  roles: { cache: RoleCache };
  unmanageable: Set<string>;
  members: {
    me: {
      permissions: { has: () => boolean };
      roles: { highest: { comparePositionTo: (role: { id: string }) => number } };
    };
    _members: Map<string, FakeMember>;
    fetch: (id: string) => Promise<FakeMember>;
  };
}

function makeGuild(id = GUILD): FakeGuild {
  const roleCache = new RoleCache();
  for (const roleId of ALL_ROLES) roleCache.set(roleId, { id: roleId });

  const guild = {
    id,
    roles: { cache: roleCache },
    unmanageable: new Set<string>(),
  } as FakeGuild;

  guild.members = {
    me: {
      permissions: { has: () => botHasManageRoles },
      roles: {
        highest: {
          comparePositionTo: (role) => (guild.unmanageable.has(role.id) ? -1 : 1),
        },
      },
    },
    _members: new Map(),
    fetch: (memberId) => {
      const m = guild.members._members.get(memberId);
      return m ? Promise.resolve(m) : Promise.reject(new Error("Unknown Member"));
    },
  };
  return guild;
}

let botHasManageRoles = true;

function tagIdentity(guildId: string | null, enabled: boolean) {
  if (guildId === null) return null;
  return { identityEnabled: enabled, identityGuildId: guildId, tag: "ROBT" };
}

function addMember(
  guild: FakeGuild,
  userId: string,
  roleIds: string[],
  primaryGuild: unknown = null,
): FakeMember {
  const cache = new RoleCache();
  for (const roleId of roleIds) cache.set(roleId, { id: roleId });
  const member: FakeMember = {
    id: userId,
    guild,
    user: { id: userId, primaryGuild },
    permissions: { has: () => false },
    roles: {
      cache,
      add: async (ids) => {
        for (const i of Array.isArray(ids) ? ids : [ids]) cache.set(i, { id: i });
      },
      remove: async (ids) => {
        for (const i of Array.isArray(ids) ? ids : [ids]) cache.delete(i);
      },
    },
  };
  guild.members._members.set(userId, member);
  return member;
}

let dmCount = 0;
let logLines: string[] = [];

const fakeLogChannel = {
  type: ChannelType.GuildText,
  id: LOG_CHANNEL,
  send: async (payload: { content: string }) => {
    logLines.push(payload.content);
    return { id: "msg" };
  },
};

function attachFakeClient(...guilds: FakeGuild[]): void {
  attachServerTagClient({
    guilds: { cache: new Map(guilds.map((g) => [g.id, g])) },
    channels: { fetch: async () => fakeLogChannel },
    users: {
      fetch: async () => ({
        createDM: async () => ({
          send: async () => {
            dmCount += 1;
          },
        }),
      }),
    },
  } as never);
}

async function seedConfig(guildId = GUILD): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId });
  await RoleConfigModel.create([
    { guildId, roleId: R_START, type: RoleConfigType.START, level: 0 },
    { guildId, roleId: R_END, type: RoleConfigType.END, level: 1 },
    { guildId, roleId: R_STAFF, type: RoleConfigType.STAFF },
    { guildId, roleId: R_MANAGER, type: RoleConfigType.STAFF_MANAGER },
    { guildId, roleId: R_WARN1, type: RoleConfigType.WARN_1 },
    { guildId, roleId: R_TAG, type: RoleConfigType.TAG },
    { guildId, roleId: R_BLACKLIST, type: RoleConfigType.BLACKLIST },
  ]);
  await ChannelConfigModel.findOneAndUpdate(
    { guildId, type: ChannelConfigType.SERVER_TAG_LOG },
    { $set: { channelId: LOG_CHANNEL } },
    { upsert: true },
  );
}

function activeRestriction(staffId: string, guildId = GUILD) {
  return StaffTagRestrictionModel.findOne({ guildId, staffId, isActive: true }).exec();
}

describe.skipIf(!hasDb)("Server Tag enforcement (MongoDB + Discord fakes)", () => {
  let guild: FakeGuild;

  beforeAll(async () => {
    await StaffTagRestrictionModel.syncIndexes();
  });

  beforeEach(async () => {
    botHasManageRoles = true;
    dmCount = 0;
    logLines = [];
    guild = makeGuild();
    attachFakeClient(guild);
    await seedConfig();
    await Promise.all([
      StaffTagRestrictionModel.deleteMany({}),
      StaffModel.deleteMany({ guildId: GUILD }),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      StaffTagRestrictionModel.deleteMany({}),
      StaffModel.deleteMany({ guildId: GUILD }),
      RoleConfigModel.deleteMany({ guildId: GUILD }),
      RoleConfigModel.deleteMany({ guildId: OTHER_GUILD }),
      ChannelConfigModel.deleteMany({ guildId: GUILD }),
    ]);
  });

  it("grants the Tag Role to a normal member who enables the Server Tag", async () => {
    const member = addMember(guild, "u-normal", [R_COMMUNITY]);

    const outcome = await serverTagService.handleTagAdded(guild as never, member.id);

    expect(outcome).toBe("granted");
    expect(member.roles.cache.has(R_TAG)).toBe(true);
    expect(await activeRestriction(member.id)).toBeNull();
  });

  it("removes only the Tag Role when a non-staff member drops the tag", async () => {
    const member = addMember(guild, "u-normal", [R_COMMUNITY, R_TAG]);

    const outcome = await serverTagService.handleTagRemoved(guild as never, member.id);

    expect(outcome).toBe("removed");
    expect(member.roles.cache.has(R_TAG)).toBe(false);
    expect(member.roles.cache.has(R_COMMUNITY)).toBe(true);

    expect(await activeRestriction(member.id)).toBeNull();
  });

  it("grants the Tag Role to a staff member without touching their staff roles", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START]);

    await serverTagService.handleTagAdded(guild as never, member.id);

    expect(member.roles.cache.has(R_TAG)).toBe(true);
    expect(member.roles.cache.has(R_STAFF)).toBe(true);
    expect(member.roles.cache.has(R_START)).toBe(true);
  });

  it("snapshots and strips staff roles, DMs the member, and opens a 3-day restriction", async () => {
    const member = addMember(guild, "u-staff", [
      R_STAFF,
      R_START,
      R_WARN1,
      R_MANAGER,
      R_TAG,
      R_COMMUNITY,
      R_BLACKLIST,
    ]);
    const before = Date.now();

    const outcome = await serverTagService.handleTagRemoved(guild as never, member.id);

    expect(outcome).toBe("restricted");

    const restriction = await activeRestriction(member.id);
    expect(restriction).not.toBeNull();
    expect(restriction!.status).toBe(StaffTagRestrictionStatus.ACTIVE);

    expect([...restriction!.savedRoleIds].sort()).toEqual(
      [R_STAFF, R_START, R_WARN1, R_MANAGER].sort(),
    );

    expect(restriction!.savedRoleIds).not.toContain(R_BLACKLIST);

    expect(restriction!.savedRoleIds).not.toContain(R_COMMUNITY);

    for (const roleId of [R_STAFF, R_START, R_WARN1, R_MANAGER]) {
      expect(member.roles.cache.has(roleId)).toBe(false);
    }

    expect(member.roles.cache.has(R_BLACKLIST)).toBe(true);
    expect(member.roles.cache.has(R_COMMUNITY)).toBe(true);
    expect(member.roles.cache.has(R_TAG)).toBe(false);

    const windowMs = restriction!.expiresAt.getTime() - restriction!.startedAt.getTime();
    expect(windowMs).toBe(3 * 86_400_000);
    expect(restriction!.startedAt.getTime()).toBeGreaterThanOrEqual(before);

    expect(dmCount).toBe(1);
  });

  it("does not fire, blacklist, or change Staff status (§14, §15)", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START]);
    await StaffModel.create({
      guildId: GUILD,
      userId: member.id,
      status: StaffStatus.ACTIVE,
      currentRoleLevel: 1,
    });

    await serverTagService.handleTagRemoved(guild as never, member.id);

    const staff = await StaffModel.findOne({ guildId: GUILD, userId: member.id }).exec();
    expect(staff!.status).toBe(StaffStatus.ACTIVE);
    expect(staff!.currentRoleLevel).toBe(1);
    expect(staff!.firedAt).toBeUndefined();
    expect(member.roles.cache.has(R_BLACKLIST)).toBe(false);
  });

  it("creates no restriction when the member holds no managed staff roles", async () => {
    const member = addMember(guild, "u-community", [R_COMMUNITY, R_BLACKLIST, R_TAG]);

    const outcome = await serverTagService.handleTagRemoved(guild as never, member.id);

    expect(outcome).toBe("removed");
    expect(await activeRestriction(member.id)).toBeNull();
    expect(member.roles.cache.has(R_BLACKLIST)).toBe(true);
  });

  it("restores the exact saved roles when the tag comes back", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_WARN1, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);
    dmCount = 0;

    const outcome = await serverTagService.handleTagAdded(guild as never, member.id);

    expect(outcome).toBe("restored");
    for (const roleId of [R_STAFF, R_START, R_WARN1]) {
      expect(member.roles.cache.has(roleId)).toBe(true);
    }

    expect(member.roles.cache.has(R_TAG)).toBe(true);

    expect(await activeRestriction(member.id)).toBeNull();
    const closed = await StaffTagRestrictionModel.findOne({ staffId: member.id }).exec();
    expect(closed!.status).toBe(StaffTagRestrictionStatus.RESTORED);
    expect(closed!.restorationReason).toBe(StaffTagRestorationReason.TAG_REAPPLIED);
    expect(closed!.restoredAt).toBeInstanceOf(Date);
    expect(closed!.rolesRestored).toBe(true);
    expect(dmCount).toBe(1);
  });

  it("does not resurrect roles from a RESTORED or EXPIRED restriction (§19)", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);
    await serverTagService.handleTagAdded(guild as never, member.id);

    await member.roles.remove([R_STAFF, R_START]);
    const outcome = await serverTagService.handleTagAdded(guild as never, member.id);

    expect(outcome).toBe("granted");
    expect(member.roles.cache.has(R_STAFF)).toBe(false);
    expect(member.roles.cache.has(R_START)).toBe(false);
  });

  it("restores automatically after 3 days without the tag coming back", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_WARN1, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);
    dmCount = 0;

    expect((await serverTagExpirationService.sweep(new Date())).restored).toBe(0);
    expect(member.roles.cache.has(R_STAFF)).toBe(false);

    const afterWindow = new Date(Date.now() + 3 * 86_400_000 + 1000);
    const tally = await serverTagExpirationService.sweep(afterWindow);

    expect(tally.restored).toBe(1);
    for (const roleId of [R_STAFF, R_START, R_WARN1]) {
      expect(member.roles.cache.has(roleId)).toBe(true);
    }

    const closed = await StaffTagRestrictionModel.findOne({ staffId: member.id }).exec();
    expect(closed!.status).toBe(StaffTagRestrictionStatus.EXPIRED);
    expect(closed!.restorationReason).toBe(StaffTagRestorationReason.DURATION_EXPIRED);
    expect(closed!.rolesRestored).toBe(true);
    expect(dmCount).toBe(1);
  });

  it("survives a restart mid-restriction and keeps the restriction running", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);

    const rebooted = makeGuild();
    const rejoined = addMember(rebooted, member.id, [R_COMMUNITY]);
    attachFakeClient(rebooted);

    await serverTagExpirationService.sweep(new Date());

    const still = await activeRestriction(member.id);
    expect(still).not.toBeNull();
    expect(still!.status).toBe(StaffTagRestrictionStatus.ACTIVE);
    expect(rejoined.roles.cache.has(R_STAFF)).toBe(false);
  });

  it("settles a restriction that expired while the bot was down", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);

    await StaffTagRestrictionModel.updateOne(
      { staffId: member.id, isActive: true },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    ).exec();

    const rebooted = makeGuild();
    const back = addMember(rebooted, member.id, [R_COMMUNITY]);
    attachFakeClient(rebooted);

    const tally = await serverTagExpirationService.sweep(new Date());

    expect(tally.restored).toBe(1);
    expect(back.roles.cache.has(R_STAFF)).toBe(true);
    expect(back.roles.cache.has(R_START)).toBe(true);
  });

  it("keeps the restriction when the member leaves the server", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);

    guild.members._members.delete(member.id);
    const afterWindow = new Date(Date.now() + 3 * 86_400_000 + 1000);
    const tally = await serverTagExpirationService.sweep(afterWindow);

    expect(tally["member-absent"]).toBe(1);

    const still = await activeRestriction(member.id);
    expect(still).not.toBeNull();
    expect(still!.status).toBe(StaffTagRestrictionStatus.ACTIVE);
  });

  it("restores on rejoin when the returning member is using the tag again", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);
    guild.members._members.delete(member.id);

    const rejoined = addMember(guild, member.id, [], tagIdentity(GUILD, true));
    const outcome = await serverTagHandler.handleMemberJoin(rejoined as never);

    expect(outcome).toBe("restored");
    expect(rejoined.roles.cache.has(R_STAFF)).toBe(true);
    expect(rejoined.roles.cache.has(R_TAG)).toBe(true);
    expect(await activeRestriction(member.id)).toBeNull();
  });

  it("keeps the restriction on rejoin when the tag is still absent", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);
    guild.members._members.delete(member.id);

    const rejoined = addMember(guild, member.id, [], tagIdentity(GUILD, false));
    const outcome = await serverTagHandler.handleMemberJoin(rejoined as never);

    expect(outcome).toBe("noop");
    expect(rejoined.roles.cache.has(R_STAFF)).toBe(false);
    const still = await activeRestriction(member.id);
    expect(still!.status).toBe(StaffTagRestrictionStatus.ACTIVE);
  });

  it("refuses to restore roles to a member fired during the restriction (§12)", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);

    await StaffModel.create({
      guildId: GUILD,
      userId: member.id,
      status: StaffStatus.FIRED,
      currentRoleLevel: 0,
    });

    const afterWindow = new Date(Date.now() + 3 * 86_400_000 + 1000);
    const tally = await serverTagExpirationService.sweep(afterWindow);

    expect(tally.blocked).toBe(1);
    expect(member.roles.cache.has(R_STAFF)).toBe(false);
    const closed = await StaffTagRestrictionModel.findOne({ staffId: member.id }).exec();
    expect(closed!.status).toBe(StaffTagRestrictionStatus.CANCELLED);
    expect(closed!.restorationReason).toBe(StaffTagRestorationReason.STAFF_LIFECYCLE);
    expect(closed!.rolesRestored).toBe(false);
  });

  it("skips a saved role that was deleted and still restores the rest", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_WARN1, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);

    guild.roles.cache.delete(R_WARN1);

    await serverTagService.handleTagAdded(guild as never, member.id);

    expect(member.roles.cache.has(R_STAFF)).toBe(true);
    expect(member.roles.cache.has(R_START)).toBe(true);
    expect(member.roles.cache.has(R_WARN1)).toBe(false);

    const closed = await StaffTagRestrictionModel.findOne({ staffId: member.id }).exec();
    expect(closed!.status).toBe(StaffTagRestrictionStatus.RESTORED);
    expect(closed!.missingRoleIds).toEqual([R_WARN1]);
    expect(closed!.rolesRestored).toBe(true);
  });

  it("leaves a role the bot cannot manage alone instead of failing the batch", async () => {
    guild.unmanageable.add(R_MANAGER);
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_MANAGER, R_TAG]);

    await serverTagService.handleTagRemoved(guild as never, member.id);

    const restriction = await activeRestriction(member.id);
    expect(restriction!.savedRoleIds).toContain(R_MANAGER);
    expect(member.roles.cache.has(R_STAFF)).toBe(false);
    expect(member.roles.cache.has(R_MANAGER)).toBe(true);
    expect(logLines.join("\n")).toContain("<@&r-staff-manager>");
  });

  it("aborts cleanly when the bot lacks Manage Roles", async () => {
    botHasManageRoles = false;
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);

    const outcome = await serverTagService.handleTagRemoved(guild as never, member.id);

    expect(outcome).toBe("blocked");
    expect(await activeRestriction(member.id)).toBeNull();
    expect(member.roles.cache.has(R_STAFF)).toBe(true);
  });

  it("tolerates a missing Tag Role configuration", async () => {
    await RoleConfigModel.deleteMany({ guildId: GUILD, type: RoleConfigType.TAG });
    const member = addMember(guild, "u-staff", [R_STAFF, R_START]);

    const added = await serverTagService.handleTagAdded(guild as never, member.id);
    expect(added).toBe("granted");

    const removed = await serverTagService.handleTagRemoved(guild as never, member.id);
    expect(removed).toBe("restricted");
    expect(member.roles.cache.has(R_STAFF)).toBe(false);
  });

  it("creates exactly one restriction when two tag-remove events race", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_WARN1, R_TAG]);

    const results = await Promise.all([
      serverTagService.handleTagRemoved(guild as never, member.id),
      serverTagService.handleTagRemoved(guild as never, member.id),
    ]);

    expect(results.filter((r) => r === "restricted")).toHaveLength(1);
    expect(await StaffTagRestrictionModel.countDocuments({ staffId: member.id })).toBe(1);

    const restriction = await activeRestriction(member.id);
    expect([...restriction!.savedRoleIds].sort()).toEqual([R_STAFF, R_START, R_WARN1].sort());
  });

  it("restores only once when two tag-enable events race", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);
    dmCount = 0;

    const results = await Promise.all([
      serverTagService.handleTagAdded(guild as never, member.id),
      serverTagService.handleTagAdded(guild as never, member.id),
    ]);

    expect(results.filter((r) => r === "restored")).toHaveLength(1);
    expect(results.filter((r) => r === "already")).toHaveLength(1);
    expect(dmCount).toBe(1);
    expect(member.roles.cache.has(R_STAFF)).toBe(true);
  });

  it("is a no-op for repeated tag-enable events on an unrestricted member", async () => {
    const member = addMember(guild, "u-normal", [R_COMMUNITY]);

    await serverTagService.handleTagAdded(guild as never, member.id);
    await serverTagService.handleTagAdded(guild as never, member.id);

    expect(member.roles.cache.has(R_TAG)).toBe(true);
    expect(await StaffTagRestrictionModel.countDocuments({ staffId: member.id })).toBe(0);
  });

  it("ignores userUpdate events that do not change the tag state", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);

    const results = await serverTagHandler.handleUserUpdate(
      { id: member.id, partial: false, primaryGuild: tagIdentity(GUILD, true) } as never,
      { id: member.id, primaryGuild: tagIdentity(GUILD, true) } as never,
    );

    expect(results).toEqual([]);
    expect(member.roles.cache.has(R_STAFF)).toBe(true);
    expect(await activeRestriction(member.id)).toBeNull();
  });

  it("routes a real tag removal through the handler to a restriction", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);

    const results = await serverTagHandler.handleUserUpdate(
      { id: member.id, partial: false, primaryGuild: tagIdentity(GUILD, true) } as never,
      { id: member.id, primaryGuild: tagIdentity(GUILD, false) } as never,
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.outcome).toBe("restricted");
    expect(member.roles.cache.has(R_STAFF)).toBe(false);
  });

  it("ignores a tag belonging to a different guild (§28)", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START]);

    const results = await serverTagHandler.handleUserUpdate(
      { id: member.id, partial: false, primaryGuild: null } as never,
      { id: member.id, primaryGuild: tagIdentity(OTHER_GUILD, true) } as never,
    );

    expect(results).toEqual([]);
    expect(member.roles.cache.has(R_TAG)).toBe(false);
  });

  it("isolates restrictions per guild", async () => {
    const other = makeGuild(OTHER_GUILD);
    attachFakeClient(guild, other);
    await seedConfig(OTHER_GUILD);

    const here = addMember(guild, "u-multi", [R_STAFF, R_START, R_TAG]);
    const there = addMember(other, "u-multi", [R_STAFF, R_START, R_TAG]);

    await serverTagService.handleTagRemoved(guild as never, "u-multi");

    expect(here.roles.cache.has(R_STAFF)).toBe(false);
    expect(there.roles.cache.has(R_STAFF)).toBe(true);
    expect(await activeRestriction("u-multi", GUILD)).not.toBeNull();
    expect(await activeRestriction("u-multi", OTHER_GUILD)).toBeNull();

    await StaffTagRestrictionModel.deleteMany({ guildId: OTHER_GUILD });
  });

  it("does nothing when the member is no longer in the guild", async () => {
    const outcome = await serverTagService.handleTagAdded(guild as never, "ghost");
    expect(outcome).toBe("member-gone");
    expect(await activeRestriction("ghost")).toBeNull();
  });

  it("exposes exactly one ACTIVE restriction per guild+staff", async () => {
    const member = addMember(guild, "u-staff", [R_STAFF, R_START, R_TAG]);
    await serverTagService.handleTagRemoved(guild as never, member.id);

    const second = await staffTagRestrictionService.createRestriction({
      guildId: GUILD,
      staffId: member.id,
      savedRoleIds: [R_STAFF],
    });

    expect(second.outcome).toBe("already-active");
    expect(await StaffTagRestrictionModel.countDocuments({ staffId: member.id })).toBe(1);
  });

  it("honours a custom restriction duration", async () => {
    const created = await staffTagRestrictionService.createRestriction({
      guildId: GUILD,
      staffId: "u-custom",
      savedRoleIds: [R_STAFF],
      durationMs: 60_000,
    });

    expect(created.outcome).toBe("created");
    const { startedAt, expiresAt } = created.restriction!;
    expect(expiresAt.getTime() - startedAt.getTime()).toBe(60_000);
  });
});
