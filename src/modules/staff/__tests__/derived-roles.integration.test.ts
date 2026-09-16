import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { staffAccessRoleService } from "../../configuration/services/staff-access-role.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { invalidateStaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffActivityModel } from "../models/staff-activity.model.ts";
import { StaffHistoryModel } from "../models/staff-history.model.ts";
import { StaffStatus } from "../types/enums.ts";
import {
  AcceptedRoleError,
  AcceptedRoleProblem,
  staffAcceptedRoleService as accepted,
} from "../services/staff-accepted-role.service.ts";
import { staffRoleAssignmentService as assign } from "../services/staff-role-assignment.service.ts";
import { planStaffRoles } from "../services/staff-role-sync.service.ts";
import { captureStaffRoleSnapshot } from "../services/staff-role-snapshot.ts";
import {
  SYSTEM_ACTOR,
  staffManagementService,
} from "../services/staff-management.service.ts";

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

const GUILD = "derived-itest-guild";
const MARKER = "d-staff";

const LADDER = ["d-l0", "d-l1", "d-l2", "d-l3"];
const ACCEPTED = "d-accepted";
const COMMUNITY = "d-community";
const MOD_ACCESS = "d-mod-access";
const SENIOR = "d-senior";
const EVENT_ACCESS = "d-event-access";
const UNRELATED = "d-unrelated";
const BLACKLIST = "d-blacklist";

const ALL = [
  MARKER,
  ...LADDER,
  ACCEPTED,
  COMMUNITY,
  MOD_ACCESS,
  SENIOR,
  EVENT_ACCESS,
  UNRELATED,
  BLACKLIST,
];

class RoleCache extends Map<string, { id: string; position: number; managed: boolean }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

function makeGuild() {
  const cache = new RoleCache();
  ALL.forEach((id, i) => cache.set(id, { id, position: i + 1, managed: false }));
  cache.set(GUILD, { id: GUILD, position: 0, managed: false });
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
      fetch: async (id: string) => members.get(id) ?? Promise.reject(new Error("Unknown")),
    },
  };
}

function addMember(guild: ReturnType<typeof makeGuild>, id: string, roleIds: string[] = []) {
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

const role = (guild: ReturnType<typeof makeGuild>, id: string) => guild.roles.cache.get(id) as never;

async function seed(): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId: GUILD });
  await roleConfigService.rebuildLadder(GUILD, LADDER);
  await roleConfigService.setRole({ guildId: GUILD, roleId: MARKER, type: RoleConfigType.STAFF });
  await roleConfigService.setRole({
    guildId: GUILD,
    roleId: BLACKLIST,
    type: RoleConfigType.BLACKLIST,
  });
  invalidateStaffHierarchy(GUILD);
}

const held = (member: { roles: { cache: RoleCache } }) => [...member.roles.cache.keys()].sort();

describe.skipIf(!hasDb)("Accepted Role and Staff Role Assignments", () => {
  let guild: ReturnType<typeof makeGuild>;

  beforeEach(async () => {
    guild = makeGuild();
    await seed();
    await Promise.all([
      StaffModel.deleteMany({ guildId: GUILD }),
      StaffActivityModel.deleteMany({}),
      StaffHistoryModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      StaffModel.deleteMany({ guildId: GUILD }),
      RoleConfigModel.deleteMany({ guildId: GUILD }),
    ]);
  });

  it("stores an accepted role with no level and no ladder impact", async () => {
    await accepted.configure({ guild: guild as never, role: role(guild, ACCEPTED) });

    const row = await roleConfigService.get(GUILD, ACCEPTED);
    expect(row!.type).toBe(RoleConfigType.ACCEPTED);
    expect(row!.level).toBeUndefined();
    expect(await roleConfigService.getStaffLevel(GUILD, ACCEPTED)).toBeNull();
    expect((await roleConfigService.getStaffRoleLevels(GUILD)).map((r) => r.roleId)).toEqual(
      LADDER,
    );
  });

  it("resolves from/to through the hierarchy, not role positions", async () => {
    const cfg = await accepted.configure({
      guild: guild as never,
      role: role(guild, ACCEPTED),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l2"),
    });
    expect(cfg.fromLevel).toBe(0);
    expect(cfg.toLevel).toBe(2);
  });

  it("rejects invalid accepted-role configuration", async () => {
    const attempt = (input: Record<string, unknown>) =>
      accepted
        .configure({ guild: guild as never, ...input } as never)
        .then(() => null)
        .catch((e: unknown) => (e as AcceptedRoleError).problem);

    expect(await attempt({ role: role(guild, GUILD) })).toBe(AcceptedRoleProblem.EVERYONE);
    expect(
      await attempt({ role: role(guild, ACCEPTED), fromRole: role(guild, "d-l0") }),
    ).toBe(AcceptedRoleProblem.FROM_WITHOUT_TO);
    expect(await attempt({ role: role(guild, ACCEPTED), toRole: role(guild, "d-l0") })).toBe(
      AcceptedRoleProblem.TO_WITHOUT_FROM,
    );
    expect(
      await attempt({
        role: role(guild, ACCEPTED),
        fromRole: role(guild, COMMUNITY),
        toRole: role(guild, "d-l2"),
      }),
    ).toBe(AcceptedRoleProblem.FROM_NOT_NUMBERED);
    expect(
      await attempt({
        role: role(guild, ACCEPTED),
        fromRole: role(guild, "d-l2"),
        toRole: role(guild, "d-l0"),
      }),
    ).toBe(AcceptedRoleProblem.RANGE_INVERTED);

    expect(await attempt({ role: role(guild, "d-l1") })).toBe(AcceptedRoleProblem.RESERVED);
  });

  it("resolves the spec's multi-assignment table exactly", async () => {
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, COMMUNITY),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l2"),
    });
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, MOD_ACCESS),
      fromRole: role(guild, "d-l1"),
      toRole: role(guild, "d-l2"),
    });
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, SENIOR),
      fromRole: role(guild, "d-l3"),
      toRole: role(guild, "d-l3"),
    });

    const at = async (level: number) =>
      (await assign.getRequiredRolesForLevel(GUILD, level)).sort();

    expect(await at(0)).toEqual([COMMUNITY]);
    expect(await at(1)).toEqual([COMMUNITY, MOD_ACCESS].sort());
    expect(await at(2)).toEqual([COMMUNITY, MOD_ACCESS].sort());
    expect(await at(3)).toEqual([SENIOR]);
  });

  it("applies an unranged assignment to every level", async () => {
    await assign.configureAssignment({ guild: guild as never, role: role(guild, COMMUNITY) });

    for (const level of [0, 1, 2, 3]) {
      expect(await assign.getRequiredRolesForLevel(GUILD, level)).toEqual([COMMUNITY]);
    }
  });

  it("plans hierarchy, assignments and the accepted role together", async () => {
    await accepted.configure({
      guild: guild as never,
      role: role(guild, ACCEPTED),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l1"),
    });
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, SENIOR),
      fromRole: role(guild, "d-l2"),
      toRole: role(guild, "d-l3"),
    });

    const atOne = await planStaffRoles(GUILD, 1);
    expect(atOne.add.sort()).toEqual([MARKER, "d-l0", "d-l1", ACCEPTED].sort());
    expect(atOne.remove.sort()).toEqual(["d-l2", "d-l3", SENIOR].sort());

    const atThree = await planStaffRoles(GUILD, 3);
    expect(atThree.add).toContain(SENIOR);
    expect(atThree.remove).toContain(ACCEPTED);
  });

  it("grants the accepted role and applicable assignments on accept", async () => {
    await accepted.configure({ guild: guild as never, role: role(guild, ACCEPTED) });
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, COMMUNITY),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l2"),
    });
    const member = addMember(guild, "u-accept", [UNRELATED]);

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 0);

    expect(held(member)).toEqual([MARKER, "d-l0", ACCEPTED, COMMUNITY, UNRELATED].sort());
  });

  it("gives every ladder rung up to the accepted level plus derived roles", async () => {
    await accepted.configure({ guild: guild as never, role: role(guild, ACCEPTED) });
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, SENIOR),
      fromRole: role(guild, "d-l3"),
      toRole: role(guild, "d-l3"),
    });
    const member = addMember(guild, "u-accept-high");

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 3);

    expect(held(member)).toEqual(
      [MARKER, "d-l0", "d-l1", "d-l2", "d-l3", ACCEPTED, SENIOR].sort(),
    );
  });

  it("does not grant the accepted role outside its configured window", async () => {
    await accepted.configure({
      guild: guild as never,
      role: role(guild, ACCEPTED),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l2"),
    });
    const member = addMember(guild, "u-out-of-range");

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 3);

    expect(member.roles.cache.has(ACCEPTED)).toBe(false);
    expect(member.roles.cache.has("d-l3")).toBe(true);
  });

  it("adds an assignment when promotion enters its window", async () => {
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, MOD_ACCESS),
      fromRole: role(guild, "d-l1"),
      toRole: role(guild, "d-l3"),
    });
    const member = addMember(guild, "u-promote");
    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 0);
    expect(member.roles.cache.has(MOD_ACCESS)).toBe(false);

    await staffManagementService.promote(member as never, SYSTEM_ACTOR, 1);

    expect(member.roles.cache.has(MOD_ACCESS)).toBe(true);
  });

  it("removes an assignment when promotion leaves its window", async () => {
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, MOD_ACCESS),
      fromRole: role(guild, "d-l1"),
      toRole: role(guild, "d-l2"),
    });
    const member = addMember(guild, "u-promote-out");
    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 2);
    expect(member.roles.cache.has(MOD_ACCESS)).toBe(true);

    await staffManagementService.promote(member as never, SYSTEM_ACTOR, 1);

    expect(member.roles.cache.has(MOD_ACCESS)).toBe(false);
    expect(member.roles.cache.has("d-l3")).toBe(true);
  });

  it("re-evaluates assignments on demotion", async () => {
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, COMMUNITY),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l1"),
    });
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, SENIOR),
      fromRole: role(guild, "d-l2"),
      toRole: role(guild, "d-l3"),
    });
    const member = addMember(guild, "u-demote");
    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 3);
    expect(member.roles.cache.has(SENIOR)).toBe(true);

    await staffManagementService.demote(member as never, SYSTEM_ACTOR, 2);

    expect(member.roles.cache.has(SENIOR)).toBe(false);
    expect(member.roles.cache.has(COMMUNITY)).toBe(true);
  });

  it("never lets a derived role change the calculated staff level", async () => {
    await accepted.configure({ guild: guild as never, role: role(guild, ACCEPTED) });
    await assign.configureAssignment({ guild: guild as never, role: role(guild, COMMUNITY) });
    const member = addMember(guild, "u-level");

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 2);

    const staff = await StaffModel.findOne({ guildId: GUILD, userId: member.id }).exec();
    expect(staff!.currentRoleLevel).toBe(2);
    const snapshot = await captureStaffRoleSnapshot(member as never, GUILD);
    expect(snapshot.currentRoleLevel).toBe(2);
  });

  it("removes derived roles on fire but keeps unrelated roles", async () => {
    await accepted.configure({ guild: guild as never, role: role(guild, ACCEPTED) });
    await assign.configureAssignment({ guild: guild as never, role: role(guild, COMMUNITY) });
    await staffAccessRoleService.addAccessRole(guild as never, role(guild, EVENT_ACCESS));
    const member = addMember(guild, "u-fire", [UNRELATED, EVENT_ACCESS]);
    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 1);

    await staffManagementService.fire(member as never, SYSTEM_ACTOR, false);

    for (const id of [MARKER, "d-l0", "d-l1", ACCEPTED, COMMUNITY, EVENT_ACCESS]) {
      expect(member.roles.cache.has(id)).toBe(false);
    }
    expect(member.roles.cache.has(UNRELATED)).toBe(true);
    expect(member.roles.cache.has(BLACKLIST)).toBe(false);
  });

  it("captures assignment and accepted roles in their own snapshot lists", async () => {
    await accepted.configure({ guild: guild as never, role: role(guild, ACCEPTED) });
    await assign.configureAssignment({ guild: guild as never, role: role(guild, COMMUNITY) });
    await staffAccessRoleService.addAccessRole(guild as never, role(guild, EVENT_ACCESS));
    const member = addMember(guild, "u-snap", [EVENT_ACCESS, UNRELATED]);
    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 1);

    const snapshot = await captureStaffRoleSnapshot(member as never, GUILD);

    expect(snapshot.staffRoleIds.sort()).toEqual([MARKER, "d-l0", "d-l1"].sort());
    expect(snapshot.accessRoleIds).toEqual([EVENT_ACCESS]);
    expect(snapshot.acceptedRoleIds).toEqual([ACCEPTED]);
    expect(snapshot.assignedRoleIds).toEqual([COMMUNITY]);
    expect(snapshot.currentRoleLevel).toBe(1);
  });

  it("reflects a changed assignment window immediately", async () => {
    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, COMMUNITY),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l0"),
    });
    expect(await assign.getRequiredRolesForLevel(GUILD, 2)).toEqual([]);

    await assign.configureAssignment({
      guild: guild as never,
      role: role(guild, COMMUNITY),
      fromRole: role(guild, "d-l0"),
      toRole: role(guild, "d-l3"),
    });
    expect(await assign.getRequiredRolesForLevel(GUILD, 2)).toEqual([COMMUNITY]);

    await assign.removeAssignment(GUILD, COMMUNITY);
    expect(await assign.getAssignments(GUILD)).toEqual([]);
  });
});
