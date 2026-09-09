import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { ChannelType } from "discord.js";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { ChannelConfigModel } from "../../configuration/models/channel-config.model.ts";
import { RoleConfigType, ChannelConfigType } from "../../configuration/types/enums.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffHistoryModel } from "../../staff/models/staff-history.model.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { VacationModel } from "../models/vacation.model.ts";
import { VacationStatus } from "../types/enums.ts";
import { attachVacationClient } from "../runtime.ts";
import { vacationService } from "../services/vacation.service.ts";
import { vacationExpirationService } from "../services/vacation-expiration.service.ts";

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

const GUILD = "vac-itest-guild";
const R_START = "role-start";
const R_END = "role-end";
const R_STAFF = "role-staff-general";
const R_VAC = "role-vacation";
const R_CHANNEL = "chan-vac-requests";

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

interface FakeMember {
  id: string;
  guild: FakeGuild;
  permissions: { has: () => boolean };
  roles: {
    cache: RoleCache;
    highest: { comparePositionTo: () => number };
    add: (ids: string | string[]) => Promise<void>;
    remove: (ids: string | string[]) => Promise<void>;
  };
}

interface FakeGuild {
  id: string;
  roles: { cache: RoleCache };
  members: {
    me: { permissions: { has: () => boolean }; roles: { highest: { comparePositionTo: () => number } } };
    _members: Map<string, FakeMember>;
    fetch: (id: string) => Promise<FakeMember>;
  };
}

function makeGuild(): FakeGuild {
  const roleCache = new RoleCache();
  for (const id of [R_START, R_END, R_STAFF, R_VAC]) roleCache.set(id, { id });
  const members: FakeGuild["members"] = {
    me: {
      permissions: { has: () => true },
      roles: { highest: { comparePositionTo: () => 1 } },
    },
    _members: new Map(),
    fetch: (id) => {
      const m = members._members.get(id);
      return m ? Promise.resolve(m) : Promise.reject(new Error("Unknown Member"));
    },
  };
  return { id: GUILD, roles: { cache: roleCache }, members };
}

function addMember(
  guild: FakeGuild,
  userId: string,
  roleIds: string[],
  isAdmin = false,
): FakeMember {
  const cache = new RoleCache();
  for (const id of roleIds) cache.set(id, { id });
  const member: FakeMember = {
    id: userId,
    guild,
    permissions: { has: () => isAdmin },
    roles: {
      cache,
      highest: { comparePositionTo: () => -1 },
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

let sentMessages = 0;
const fakeChannel = {
  type: ChannelType.GuildText,
  id: R_CHANNEL,
  send: async () => ({ id: `msg-${++sentMessages}` }),
  messages: { fetch: async () => ({ edit: async () => undefined }) },
};

function attachFakeClient(guild: FakeGuild): void {
  attachVacationClient({
    guilds: { cache: new Map([[GUILD, guild]]) },
    channels: { fetch: async () => fakeChannel },
    users: { fetch: async () => ({ createDM: async () => ({ send: async () => undefined }) }) },
  } as never);
}

async function seedConfig(): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId: GUILD });
  await RoleConfigModel.create([
    { guildId: GUILD, roleId: R_START, type: RoleConfigType.START, level: 0 },
    { guildId: GUILD, roleId: R_END, type: RoleConfigType.END, level: 1 },
    { guildId: GUILD, roleId: R_STAFF, type: RoleConfigType.STAFF },
    { guildId: GUILD, roleId: R_VAC, type: RoleConfigType.VACATION },
  ]);
  await ChannelConfigModel.findOneAndUpdate(
    { guildId: GUILD, type: ChannelConfigType.VACATION_REQUESTS },
    { $set: { channelId: R_CHANNEL } },
    { upsert: true },
  );
}

async function cleanup(): Promise<void> {
  await Promise.all([
    VacationModel.deleteMany({ guildId: GUILD }),
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffActivityModel.deleteMany({}),
    StaffHistoryModel.deleteMany({}),
  ]);
}

describe.skipIf(!hasDb)("Vacation system (MongoDB + Discord fakes)", () => {
  beforeAll(async () => {
    await Promise.all([VacationModel.syncIndexes(), StaffModel.syncIndexes()]);
    await seedConfig();
  });

  afterAll(async () => {
    await cleanup();
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await ChannelConfigModel.deleteMany({ guildId: GUILD });
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await cleanup();
  });
  afterEach(async () => {
    vacationExpirationService.stop();
  });

  it("!break: removes staff roles, applies the vacation role, records ACTIVE and BREAK — level preserved", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-1", [R_START, R_END, R_STAFF]);
    await StaffModel.create({
      userId: "staff-1",
      guildId: GUILD,
      currentRoleLevel: 3,
      status: StaffStatus.ACTIVE,
    });

    const { vacation } = await vacationService.createManualBreak({
      guildId: GUILD,
      member: target as never,
      actorId: "mgr-1",
      durationInput: "7d",
    });

    expect(vacation.status).toBe(VacationStatus.ACTIVE);
    expect(vacation.savedRoleIds.sort()).toEqual([R_END, R_STAFF, R_START].sort());
    expect(target.roles.cache.has(R_VAC)).toBe(true);
    expect(target.roles.cache.has(R_START)).toBe(false);
    expect(target.roles.cache.has(R_STAFF)).toBe(false);

    const staff = await StaffModel.findOne({ userId: "staff-1", guildId: GUILD }).exec();
    expect(staff?.status).toBe(StaffStatus.BREAK);
    expect(staff?.currentRoleLevel).toBe(3);

    const acts = await StaffActivityModel.find({ referenceId: vacation.vacationId }).exec();
    expect(acts.map((a) => a.type)).toContain("BREAK");
  });

  it("!break: a second break for the same member is rejected (one open vacation)", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-2", [R_START, R_STAFF]);

    await vacationService.createManualBreak({
      guildId: GUILD,
      member: target as never,
      actorId: "mgr-1",
      durationInput: "3d",
    });
    await expect(
      vacationService.createManualBreak({
        guildId: GUILD,
        member: target as never,
        actorId: "mgr-1",
        durationInput: "1w",
      }),
    ).rejects.toThrow();

    expect(await VacationModel.countDocuments({ guildId: GUILD, staffId: "staff-2" })).toBe(1);
  });

  it("!break: missing vacation role → nothing is created", async () => {
    await RoleConfigModel.deleteOne({ guildId: GUILD, type: RoleConfigType.VACATION });
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-3", [R_START, R_STAFF]);

    await expect(
      vacationService.createManualBreak({
        guildId: GUILD,
        member: target as never,
        actorId: "mgr-1",
        durationInput: "3d",
      }),
    ).rejects.toThrow();
    expect(await VacationModel.countDocuments({ guildId: GUILD, staffId: "staff-3" })).toBe(0);

    await RoleConfigModel.create({ guildId: GUILD, roleId: R_VAC, type: RoleConfigType.VACATION });
  });

  it("application → PENDING record + request message + VACATION_REQUEST activity", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const applicant = addMember(guild, "staff-4", [R_START, R_STAFF]);

    const { vacation } = await vacationService.createApplication({
      guildId: GUILD,
      member: applicant as never,
      reasonInput: "Family trip",
      durationInput: "7",
    });

    expect(vacation.status).toBe(VacationStatus.PENDING);
    expect(vacation.type).toBe("APPLICATION");
    expect(vacation.durationUnit).toBe("DAYS");
    expect(vacation.messageId).toMatch(/^msg-/);
    expect(applicant.roles.cache.has(R_START)).toBe(true);

    const acts = await StaffActivityModel.find({ referenceId: vacation.vacationId }).exec();
    expect(acts.map((a) => a.type)).toContain("VACATION_REQUEST");
  });

  it("duplicate application is rejected", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const applicant = addMember(guild, "staff-5", [R_START, R_STAFF]);
    const base = {
      guildId: GUILD,
      member: applicant as never,
      reasonInput: "Rest",
      durationInput: "5",
    };
    await vacationService.createApplication(base);
    await expect(vacationService.createApplication(base)).rejects.toThrow();
  });

  it("approve activates the vacation; a concurrent second approve loses", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const applicant = addMember(guild, "staff-6", [R_START, R_END, R_STAFF]);
    const manager = addMember(guild, "mgr-6", [R_STAFF], true);
    await StaffModel.create({
      userId: "staff-6",
      guildId: GUILD,
      currentRoleLevel: 1,
      status: StaffStatus.ACTIVE,
    });

    const { vacation } = await vacationService.createApplication({
      guildId: GUILD,
      member: applicant as never,
      reasonInput: "Trip",
      durationInput: "1m",
    });

    const results = await Promise.allSettled([
      vacationService.approveApplication({ vacationId: vacation.vacationId, manager: manager as never }),
      vacationService.approveApplication({ vacationId: vacation.vacationId, manager: manager as never }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const stored = await VacationModel.findOne({ vacationId: vacation.vacationId }).exec();
    expect(stored?.status).toBe(VacationStatus.ACTIVE);
    expect(stored?.approvedBy).toBe("mgr-6");
    expect(applicant.roles.cache.has(R_VAC)).toBe(true);
    expect(applicant.roles.cache.has(R_START)).toBe(false);

    const staff = await StaffModel.findOne({ userId: "staff-6", guildId: GUILD }).exec();
    expect(staff?.status).toBe(StaffStatus.BREAK);
    expect(staff?.currentRoleLevel).toBe(1);
  });

  it("refuse records REJECTED, leaves roles alone, and blocks a later approve", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const applicant = addMember(guild, "staff-7", [R_START, R_STAFF]);
    const manager = addMember(guild, "mgr-7", [R_STAFF], true);

    const { vacation } = await vacationService.createApplication({
      guildId: GUILD,
      member: applicant as never,
      reasonInput: "No",
      durationInput: "10",
    });

    await vacationService.rejectApplication({
      vacationId: vacation.vacationId,
      manager: manager as never,
      reason: "Too busy this month",
    });

    const stored = await VacationModel.findOne({ vacationId: vacation.vacationId }).exec();
    expect(stored?.status).toBe(VacationStatus.REJECTED);
    expect(stored?.isOpen).toBe(false);
    expect(applicant.roles.cache.has(R_START)).toBe(true);

    await expect(
      vacationService.approveApplication({ vacationId: vacation.vacationId, manager: manager as never }),
    ).rejects.toThrow();
  });

  it("rejects an unauthorized (non-manager) decision", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const applicant = addMember(guild, "staff-8", [R_START, R_STAFF]);
    const notManager = addMember(guild, "rando-8", [R_STAFF], false);

    const { vacation } = await vacationService.createApplication({
      guildId: GUILD,
      member: applicant as never,
      reasonInput: "x",
      durationInput: "3",
    });

    await expect(
      vacationService.approveApplication({
        vacationId: vacation.vacationId,
        manager: notManager as never,
      }),
    ).rejects.toThrow();
    const stored = await VacationModel.findOne({ vacationId: vacation.vacationId }).exec();
    expect(stored?.status).toBe(VacationStatus.PENDING);
  });

  it("!unbreak restores the saved roles, ends the vacation and reactivates the staff member", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-9", [R_START, R_END, R_STAFF]);
    await StaffModel.create({
      userId: "staff-9",
      guildId: GUILD,
      currentRoleLevel: 2,
      status: StaffStatus.ACTIVE,
    });
    await vacationService.createManualBreak({
      guildId: GUILD,
      member: target as never,
      actorId: "mgr-9",
      durationInput: "30d",
    });
    expect(target.roles.cache.has(R_VAC)).toBe(true);

    const result = await vacationService.unbreak({
      guildId: GUILD,
      staffId: "staff-9",
      member: target as never,
      actorId: "mgr-9",
    });

    expect(result.vacation.status).toBe(VacationStatus.CANCELLED);
    expect(result.missingCount).toBe(0);
    expect(target.roles.cache.has(R_VAC)).toBe(false);
    expect(target.roles.cache.has(R_START)).toBe(true);
    expect(target.roles.cache.has(R_END)).toBe(true);

    const staff = await StaffModel.findOne({ userId: "staff-9", guildId: GUILD }).exec();
    expect(staff?.status).toBe(StaffStatus.ACTIVE);
    expect(staff?.currentRoleLevel).toBe(2);
  });

  it("!unbreak on a member who isn't on vacation errors", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-10", [R_START, R_STAFF]);
    await expect(
      vacationService.unbreak({
        guildId: GUILD,
        staffId: "staff-10",
        member: target as never,
        actorId: "mgr-10",
      }),
    ).rejects.toThrow();
  });

  it("expiry: an ACTIVE vacation past endsAt is completed once and roles are restored (idempotent)", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-11", [R_START, R_END, R_STAFF]);
    await StaffModel.create({
      userId: "staff-11",
      guildId: GUILD,
      currentRoleLevel: 1,
      status: StaffStatus.ACTIVE,
    });
    const { vacation } = await vacationService.createManualBreak({
      guildId: GUILD,
      member: target as never,
      actorId: "mgr-11",
      durationInput: "5m",
    });
    await VacationModel.updateOne(
      { _id: vacation._id },
      { $set: { endsAt: new Date(Date.now() - 60_000) } },
    ).exec();

    const fresh = await VacationModel.findById(vacation._id).exec();
    const first = await vacationService.expireVacation(fresh!);
    const second = await vacationService.expireVacation(fresh!);

    expect(first).toBe("completed");
    expect(second).toBe("already");

    const stored = await VacationModel.findById(vacation._id).exec();
    expect(stored?.status).toBe(VacationStatus.COMPLETED);
    expect(stored?.endedBy).toBe("BOT");
    expect(target.roles.cache.has(R_VAC)).toBe(false);
    expect(target.roles.cache.has(R_START)).toBe(true);

    const returns = await StaffActivityModel.find({
      referenceId: vacation.vacationId,
      type: "RETURN_FROM_BREAK",
    }).exec();
    expect(returns).toHaveLength(1);

    const staff = await StaffModel.findOne({ userId: "staff-11", guildId: GUILD }).exec();
    expect(staff?.status).toBe(StaffStatus.ACTIVE);
  });

  it("expiry: member absent within the grace window is deferred, not completed", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-12", [R_START, R_STAFF]);
    const { vacation } = await vacationService.createManualBreak({
      guildId: GUILD,
      member: target as never,
      actorId: "mgr-12",
      durationInput: "5m",
    });
    guild.members._members.delete("staff-12");
    await VacationModel.updateOne(
      { _id: vacation._id },
      { $set: { endsAt: new Date(Date.now() - 60_000) } },
    ).exec();

    const fresh = await VacationModel.findById(vacation._id).exec();
    const outcome = await vacationService.expireVacation(fresh!);
    expect(outcome).toBe("deferred");

    const stored = await VacationModel.findById(vacation._id).exec();
    expect(stored?.status).toBe(VacationStatus.ACTIVE);
    expect(stored?.restoreDeferredAt).toBeInstanceOf(Date);
  });

  it("sweep processes due vacations and survives with nothing due", async () => {
    const guild = makeGuild();
    attachFakeClient(guild);
    const target = addMember(guild, "staff-13", [R_START, R_STAFF]);
    const { vacation } = await vacationService.createManualBreak({
      guildId: GUILD,
      member: target as never,
      actorId: "mgr-13",
      durationInput: "5m",
    });
    await VacationModel.updateOne(
      { _id: vacation._id },
      { $set: { endsAt: new Date(Date.now() - 1000) } },
    ).exec();

    const tally = await vacationExpirationService.sweep();
    expect(tally.completed).toBe(1);
    expect((await vacationExpirationService.sweep()).completed).toBe(0);
  });
});
