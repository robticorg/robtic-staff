import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { staffAccessRoleService } from "../../configuration/services/staff-access-role.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { invalidateStaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffHistoryModel } from "../../staff/models/staff-history.model.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import {
  SYSTEM_ACTOR,
  staffManagementService,
} from "../../staff/services/staff-management.service.ts";
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

const GUILD = "access-life-guild";
const MARKER = "al-staff";
const LADDER = ["al-l0", "al-l1", "al-l2"];
const VAC = "al-vacation";
const EVENT = "al-event-team";
const CONTENT = "al-content-team";
const PARTNER = "al-partner-team";
const COMMUNITY = "al-community";

const ALL = [MARKER, ...LADDER, VAC, EVENT, CONTENT, PARTNER, COMMUNITY];

class RoleCache extends Map<string, { id: string; position: number; managed: boolean }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

function makeGuild() {
  const cache = new RoleCache();
  ALL.forEach((id, i) => cache.set(id, { id, position: i + 1, managed: false }));
  const members = new Map<string, unknown>();
  return {
    id: GUILD,
    roles: { cache },
    members: {
      me: {
        permissions: { has: () => true },
        roles: { highest: { comparePositionTo: () => 1 } },
      },
      _members: members,
      fetch: async (id: string) =>
        members.get(id) ?? Promise.reject(new Error("Unknown Member")),
    },
  };
}

function addMember(guild: ReturnType<typeof makeGuild>, id: string, roleIds: string[]) {
  const cache = new RoleCache();
  for (const r of roleIds) cache.set(r, guild.roles.cache.get(r)!);
  const member = {
    id,
    guild,
    permissions: { has: () => false },
    roles: {
      cache,
      add: async (ids: string | string[]) => {
        for (const i of Array.isArray(ids) ? ids : [ids]) {
          cache.set(i, guild.roles.cache.get(i) ?? { id: i, position: 0, managed: false });
        }
      },
      remove: async (ids: string | string[]) => {
        for (const i of Array.isArray(ids) ? ids : [ids]) cache.delete(i);
      },
    },
  };
  guild.members._members.set(id, member);
  return member;
}

function attachClient(guild: ReturnType<typeof makeGuild>) {
  attachVacationClient({
    guilds: { cache: new Map([[GUILD, guild]]) },
    channels: { fetch: async () => null },
    users: {
      fetch: async () => ({ createDM: async () => ({ send: async () => undefined }) }),
    },
  } as never);
}

async function seed(guild: ReturnType<typeof makeGuild>): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId: GUILD });
  await roleConfigService.rebuildLadder(GUILD, LADDER);
  await roleConfigService.setRole({ guildId: GUILD, roleId: MARKER, type: RoleConfigType.STAFF });
  await roleConfigService.setRole({ guildId: GUILD, roleId: VAC, type: RoleConfigType.VACATION });
  await staffAccessRoleService.addAccessRoles(guild as never, [
    guild.roles.cache.get(EVENT),
    guild.roles.cache.get(CONTENT),
    guild.roles.cache.get(PARTNER),
  ] as never);
  invalidateStaffHierarchy(GUILD);
}

describe.skipIf(!hasDb)("Access Roles through the Staff lifecycle", () => {
  let guild: ReturnType<typeof makeGuild>;

  beforeEach(async () => {
    guild = makeGuild();
    attachClient(guild);
    await seed(guild);
    await Promise.all([
      VacationModel.deleteMany({ guildId: GUILD }),
      StaffModel.deleteMany({ guildId: GUILD }),
      StaffActivityModel.deleteMany({}),
      StaffHistoryModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      VacationModel.deleteMany({ guildId: GUILD }),
      StaffModel.deleteMany({ guildId: GUILD }),
      RoleConfigModel.deleteMany({ guildId: GUILD }),
    ]);
  });

  /** Staff at level 1 holding only the Event Team access role. */
  async function staffOnBreak(userId = "u-1") {
    const member = addMember(guild, userId, [MARKER, "al-l0", "al-l1", EVENT, COMMUNITY]);
    await StaffModel.create({
      guildId: GUILD,
      userId,
      status: StaffStatus.ACTIVE,
      currentRoleLevel: 1,
    });
    await vacationService.createManualBreak({
      guildId: GUILD,
      member: member as never,
      actorId: "manager-1",
      durationInput: "3d",
    });
    return member;
  }

  it("captures and strips staff and access roles on break", async () => {
    const member = await staffOnBreak();

    const vacation = await VacationModel.findOne({ guildId: GUILD, staffId: member.id }).exec();
    expect([...vacation!.savedRoleIds].sort()).toEqual([MARKER, "al-l0", "al-l1"].sort());
    expect(vacation!.savedAccessRoleIds).toEqual([EVENT]);
    expect(vacation!.snapshotRoleLevel).toBe(1);

    // Staff + access stripped, vacation role applied, unrelated role kept.
    for (const id of [MARKER, "al-l0", "al-l1", EVENT]) {
      expect(member.roles.cache.has(id)).toBe(false);
    }
    expect(member.roles.cache.has(VAC)).toBe(true);
    expect(member.roles.cache.has(COMMUNITY)).toBe(true);
  });

  it("restores exactly the access roles that were held, and no others", async () => {
    const member = await staffOnBreak();

    await vacationService.unbreak({
      guildId: GUILD,
      staffId: member.id,
      member: member as never,
      actorId: "manager-1",
    });

    expect(member.roles.cache.has(EVENT)).toBe(true);
    // Configured but never held — must not be granted.
    expect(member.roles.cache.has(CONTENT)).toBe(false);
    expect(member.roles.cache.has(PARTNER)).toBe(false);
    for (const id of [MARKER, "al-l0", "al-l1"]) {
      expect(member.roles.cache.has(id)).toBe(true);
    }
    expect(member.roles.cache.has(VAC)).toBe(false);
  });

  it("restores the same snapshot when the vacation expires on its own", async () => {
    const member = await staffOnBreak();
    await VacationModel.updateOne(
      { guildId: GUILD, staffId: member.id, status: VacationStatus.ACTIVE },
      { $set: { endsAt: new Date(Date.now() - 1000) } },
    ).exec();

    const tally = await vacationExpirationService.sweep(new Date());

    expect(tally.completed).toBe(1);
    expect(member.roles.cache.has(EVENT)).toBe(true);
    expect(member.roles.cache.has(CONTENT)).toBe(false);
    expect(member.roles.cache.has("al-l1")).toBe(true);
  });

  it("is idempotent across a repeated sweep", async () => {
    const member = await staffOnBreak();
    await VacationModel.updateOne(
      { guildId: GUILD, staffId: member.id, status: VacationStatus.ACTIVE },
      { $set: { endsAt: new Date(Date.now() - 1000) } },
    ).exec();

    await vacationExpirationService.sweep(new Date());
    const second = await vacationExpirationService.sweep(new Date());

    expect(second.completed).toBe(0);
    expect(member.roles.cache.has(EVENT)).toBe(true);
  });

  it("removes access roles when a staff member is fired", async () => {
    const member = addMember(guild, "u-fire", [MARKER, "al-l0", "al-l1", EVENT, CONTENT, COMMUNITY]);
    await StaffModel.create({
      guildId: GUILD,
      userId: member.id,
      status: StaffStatus.ACTIVE,
      currentRoleLevel: 1,
    });

    await staffManagementService.fire(member as never, SYSTEM_ACTOR, false);

    for (const id of [MARKER, "al-l0", "al-l1", EVENT, CONTENT]) {
      expect(member.roles.cache.has(id)).toBe(false);
    }
    // Unrelated roles survive; no blacklist was requested.
    expect(member.roles.cache.has(COMMUNITY)).toBe(true);
  });

  it("does not restore access roles for someone fired during their break", async () => {
    const member = await staffOnBreak("u-fired-on-break");

    await staffManagementService.fire(member as never, SYSTEM_ACTOR, false);

    const vacation = await VacationModel.findOne({ guildId: GUILD, staffId: member.id }).exec();
    expect(vacation!.status).toBe(VacationStatus.CANCELLED);
    expect(vacation!.isOpen).toBe(false);
    expect(vacation!.savedRoleIds).toEqual([]);
    expect(vacation!.savedAccessRoleIds).toEqual([]);

    // The expiry sweeper must find nothing to restore, now or later.
    const tally = await vacationExpirationService.sweep(
      new Date(Date.now() + 10 * 86_400_000),
    );
    expect(tally.completed).toBe(0);
    expect(member.roles.cache.has(EVENT)).toBe(false);
    expect(member.roles.cache.has(MARKER)).toBe(false);
  });

  it("skips a saved access role that was deleted while on break", async () => {
    const member = await staffOnBreak("u-deleted-role");
    guild.roles.cache.delete(EVENT);

    await vacationService.unbreak({
      guildId: GUILD,
      staffId: member.id,
      member: member as never,
      actorId: "manager-1",
    });

    expect(member.roles.cache.has(EVENT)).toBe(false);
    // Everything else still came back.
    expect(member.roles.cache.has("al-l1")).toBe(true);
    expect(member.roles.cache.has(MARKER)).toBe(true);
  });

  it("keeps the staff level unchanged by access roles across the cycle", async () => {
    const member = await staffOnBreak("u-level");

    await vacationService.unbreak({
      guildId: GUILD,
      staffId: member.id,
      member: member as never,
      actorId: "manager-1",
    });

    const staff = await StaffModel.findOne({ guildId: GUILD, userId: member.id }).exec();
    expect(staff!.currentRoleLevel).toBe(1);
  });
});
