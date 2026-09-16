import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { invalidateStaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffActivityModel } from "../models/staff-activity.model.ts";
import { StaffHistoryModel } from "../models/staff-history.model.ts";
import { StaffHistoryAction, StaffType } from "../types/enums.ts";
import {
  SYSTEM_ACTOR,
  staffManagementService,
} from "../services/staff-management.service.ts";
import { staffRoleAssignmentService as assign } from "../services/staff-role-assignment.service.ts";
import { captureStaffRoleSnapshot } from "../services/staff-role-snapshot.ts";
import {
  StaffTypeError,
  StaffTypeProblem,
  staffTypeService as types,
} from "../services/staff-type.service.ts";

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

const GUILD = "stafftype-itest-guild";
const MARKER = "st-staff";
const LADDER = ["st-l0", "st-l1", "st-l2", "st-l3"];
const MAX_ROLE = "st-max";
const DEV_ROLE = "st-dev";
const COMMUNITY = "st-community";
const BLACKLIST = "st-blacklist";
const UNRELATED = "st-unrelated";

const ALL = [MARKER, ...LADDER, MAX_ROLE, DEV_ROLE, COMMUNITY, BLACKLIST, UNRELATED];

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
  cache.set("st-managed", { id: "st-managed", position: 99, managed: true });
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

const held = (m: { roles: { cache: RoleCache } }) => [...m.roles.cache.keys()].sort();

describe.skipIf(!hasDb)("Staff Types", () => {
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

  // ── Configuration ─────────────────────────────────────────────────────────

  it("stores a type role with no level and keeps it off the ladder", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));

    const row = await roleConfigService.get(GUILD, MAX_ROLE);
    expect(row!.type).toBe(RoleConfigType.STAFF_TYPE);
    expect(row!.staffType).toBe(StaffType.MAX);
    expect(row!.level).toBeUndefined();
    expect(await roleConfigService.getStaffLevel(GUILD, MAX_ROLE)).toBeNull();
    expect((await roleConfigService.getStaffRoleLevels(GUILD)).map((r) => r.roleId)).toEqual(
      LADDER,
    );
  });

  it("rejects roles that are not eligible to be a Staff Type", async () => {
    const attempt = (roleId: string) =>
      types
        .configureRole(guild as never, StaffType.MAX, role(guild, roleId))
        .then(() => null)
        .catch((e: unknown) => (e as StaffTypeError).problem);

    expect(await attempt(GUILD)).toBe(StaffTypeProblem.EVERYONE);
    expect(await attempt("st-managed")).toBe(StaffTypeProblem.MANAGED);
    // A numbered rung, the Staff marker and the blacklist role are all taken.
    expect(await attempt("st-l1")).toBe(StaffTypeProblem.RESERVED);
    expect(await attempt(MARKER)).toBe(StaffTypeProblem.RESERVED);
    expect(await attempt(BLACKLIST)).toBe(StaffTypeProblem.RESERVED);
  });

  it("accepts a role that was marked ignored", async () => {
    // Ignoring a role keeps it off the ladder — a deliberate reason to pick it
    // as a type role ("nobody gets promoted into this"). It must not be refused.
    await roleConfigService.setRole({
      guildId: GUILD,
      roleId: DEV_ROLE,
      type: RoleConfigType.IGNORE,
    });
    invalidateStaffHierarchy(GUILD);

    await types.configureRole(guild as never, StaffType.DEV, role(guild, DEV_ROLE));

    const row = await roleConfigService.get(GUILD, DEV_ROLE);
    expect(row!.type).toBe(RoleConfigType.STAFF_TYPE);
    expect(row!.staffType).toBe(StaffType.DEV);
    // Still not a ladder rung, which is what being ignored protected.
    expect(await roleConfigService.getStaffLevel(GUILD, DEV_ROLE)).toBeNull();
    expect((await roleConfigService.getStaffRoleLevels(GUILD)).map((r) => r.roleId)).toEqual(
      LADDER,
    );
  });

  it("keeps one role per type, replacing a previous binding", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    await types.configureRole(guild as never, StaffType.MAX, role(guild, COMMUNITY));

    expect(await types.getConfiguredRole(GUILD, StaffType.MAX)).toBe(COMMUNITY);
    expect(await roleConfigService.get(GUILD, MAX_ROLE)).toBeNull();
  });

  // ── Acceptance ────────────────────────────────────────────────────────────

  it("does not assign a type role on a normal acceptance", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    const member = addMember(guild, "u-plain");

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 0);

    expect(held(member)).toEqual([MARKER, "st-l0"].sort());
    expect(await types.getType(GUILD, member.id)).toBeNull();
  });

  it("assigns the configured role when accepted with a type", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    const member = addMember(guild, "u-max", [UNRELATED]);

    const result = await staffManagementService.accept(
      member as never,
      SYSTEM_ACTOR,
      0,
      StaffType.MAX,
    );

    expect(result.staffType).toBe(StaffType.MAX);
    expect(held(member)).toEqual([MARKER, "st-l0", MAX_ROLE, UNRELATED].sort());
    expect(await types.getType(GUILD, member.id)).toBe(StaffType.MAX);
  });

  it("combines a type with a level and with assignment roles", async () => {
    await types.configureRole(guild as never, StaffType.DEV, role(guild, DEV_ROLE));
    await assign.configureAssignment({ guild: guild as never, role: role(guild, COMMUNITY) });
    const member = addMember(guild, "u-dev-3");

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 3, StaffType.DEV);

    expect(held(member)).toEqual(
      [MARKER, "st-l0", "st-l1", "st-l2", "st-l3", DEV_ROLE, COMMUNITY].sort(),
    );
  });

  // ── Replacement ───────────────────────────────────────────────────────────

  it("replaces an existing type rather than stacking both", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    await types.configureRole(guild as never, StaffType.DEV, role(guild, DEV_ROLE));
    const member = addMember(guild, "u-swap");

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 0, StaffType.MAX);
    expect(member.roles.cache.has(MAX_ROLE)).toBe(true);

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 0, StaffType.DEV);

    expect(member.roles.cache.has(DEV_ROLE)).toBe(true);
    expect(member.roles.cache.has(MAX_ROLE)).toBe(false);
    expect(await types.getType(GUILD, member.id)).toBe(StaffType.DEV);
  });

  // ── Independence from the hierarchy ───────────────────────────────────────

  it("never changes the type on promotion or demotion", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    const member = addMember(guild, "u-levels");
    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 0, StaffType.MAX);

    await staffManagementService.promote(member as never, SYSTEM_ACTOR, 3);
    expect(member.roles.cache.has(MAX_ROLE)).toBe(true);

    await staffManagementService.demote(member as never, SYSTEM_ACTOR, 1);
    expect(member.roles.cache.has(MAX_ROLE)).toBe(true);
    expect(await types.getType(GUILD, member.id)).toBe(StaffType.MAX);
  });

  it("never lets a type role affect the calculated staff level", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    const member = addMember(guild, "u-level-safe");

    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 2, StaffType.MAX);

    const staff = await StaffModel.findOne({ guildId: GUILD, userId: member.id }).exec();
    expect(staff!.currentRoleLevel).toBe(2);
    const snapshot = await captureStaffRoleSnapshot(member as never, GUILD);
    expect(snapshot.currentRoleLevel).toBe(2);
    expect(snapshot.typeRoleIds).toEqual([MAX_ROLE]);
    expect(snapshot.staffRoleIds).not.toContain(MAX_ROLE);
  });

  // ── History ───────────────────────────────────────────────────────────────

  it("records the type in acceptance history, null when there is none", async () => {
    await types.configureRole(guild as never, StaffType.DEV, role(guild, DEV_ROLE));

    const typed = addMember(guild, "u-hist-typed");
    await staffManagementService.accept(typed as never, SYSTEM_ACTOR, 0, StaffType.DEV);
    const plain = addMember(guild, "u-hist-plain");
    await staffManagementService.accept(plain as never, SYSTEM_ACTOR, 0);

    const entries = await StaffHistoryModel.find({ action: StaffHistoryAction.ACCEPT }).exec();
    const byStaff = async (userId: string) => {
      const staff = await StaffModel.findOne({ guildId: GUILD, userId }).exec();
      return entries.find((e) => e.staffId.toString() === staff!._id.toString());
    };

    expect((await byStaff("u-hist-typed"))!.metadata?.staffType).toBe(StaffType.DEV);
    expect((await byStaff("u-hist-plain"))!.metadata?.staffType).toBeNull();
  });

  // ── Fire ──────────────────────────────────────────────────────────────────

  it("removes the type role on fire and keeps unrelated roles", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    const member = addMember(guild, "u-fire", [UNRELATED]);
    await staffManagementService.accept(member as never, SYSTEM_ACTOR, 1, StaffType.MAX);

    await staffManagementService.fire(member as never, SYSTEM_ACTOR, false);

    expect(member.roles.cache.has(MAX_ROLE)).toBe(false);
    expect(member.roles.cache.has(MARKER)).toBe(false);
    expect(member.roles.cache.has(UNRELATED)).toBe(true);
    expect(await types.getType(GUILD, member.id)).toBeNull();
  });

  // ── Service surface ───────────────────────────────────────────────────────

  it("resolves keywords in both languages and rejects unknown ones", () => {
    expect(types.resolveKeyword("max")).toBe(StaffType.MAX);
    expect(types.resolveKeyword("ماكس")).toBe(StaffType.MAX);
    expect(types.resolveKeyword("مبرمج")).toBe(StaffType.DEV);
    expect(types.resolveKeyword("designer")).toBeNull();
    expect(types.isValidType(StaffType.MAX)).toBe(true);
    expect(types.isValidType("DESIGNER")).toBe(false);
  });

  it("reports every configured type role for cleanup", async () => {
    await types.configureRole(guild as never, StaffType.MAX, role(guild, MAX_ROLE));
    await types.configureRole(guild as never, StaffType.DEV, role(guild, DEV_ROLE));

    expect((await types.getManagedRoleIds(GUILD)).sort()).toEqual([MAX_ROLE, DEV_ROLE].sort());
  });
});
