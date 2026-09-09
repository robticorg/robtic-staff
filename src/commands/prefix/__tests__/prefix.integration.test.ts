import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { roleConfigService } from "../../../modules/configuration/index.ts";
import { RoleConfigType } from "../../../modules/configuration/types/enums.ts";
import { channelConfigService } from "../../../modules/configuration/index.ts";
import { ChannelConfigType } from "../../../modules/configuration/types/enums.ts";
import { RoleConfigModel } from "../../../modules/configuration/models/role-config.model.ts";
import { ChannelConfigModel } from "../../../modules/configuration/models/channel-config.model.ts";
import { FastAccessModel } from "../../../modules/configuration/models/fast-access.model.ts";
import { fastAccessService } from "../../../modules/configuration/services/fast-access.service.ts";
import { FastAccessContext } from "../../../modules/configuration/types/enums.ts";
import { StaffModel } from "../../../modules/staff/models/staff.model.ts";
import { StaffPointTransactionModel } from "../../../modules/staff/models/staff-point-transaction.model.ts";
import { StaffActivityModel } from "../../../modules/staff/models/staff-activity.model.ts";
import { StaffHistoryModel } from "../../../modules/staff/models/staff-history.model.ts";
import { StaffStatus, StaffPointTransactionType, staffService } from "../../../modules/staff/index.ts";
import { staffManagementService } from "../../../modules/staff/services/staff-management.service.ts";
import { UserWarningModel } from "../../../modules/warnings/models/user-warning.model.ts";
import { StaffWarningModel } from "../../../modules/warnings/models/staff-warning.model.ts";
import { warningActionService } from "../../../modules/warnings/services/warning-actions.service.ts";

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

const GUILD = "prefix-itest-guild";
const LADDER = ["r0", "r1", "r2", "r3"];
const GENERAL = "staff-general";
const BLACKLIST = "blacklist-role";
const WARN = { 1: "warn-1", 2: "warn-2", 3: "warn-3" } as const;
const ALL_ROLE_IDS = [...LADDER, GENERAL, BLACKLIST, ...Object.values(WARN)];

interface FakeMember {
  id: string;
  guild: any;
  roles: { cache: Map<string, { id: string }>; add: (i: unknown) => Promise<void>; remove: (i: unknown) => Promise<void> };
  permissions: { has: () => boolean };
}

function fakeMember(id: string, starting: string[] = []): FakeMember {
  const cache = new Map(starting.map((r) => [r, { id: r }]));
  const guildRoles = new Map(ALL_ROLE_IDS.map((r) => [r, { id: r, name: r }]));
  const member: FakeMember = {
    id,
    guild: {
      id: GUILD,
      roles: { cache: guildRoles, fetch: async (rid: string) => guildRoles.get(rid) ?? null },
      members: { fetch: async (uid: string) => (uid === id ? member : null) },
    },
    roles: {
      cache,
      add: async (ids: unknown) => {
        for (const r of ([] as string[]).concat(ids as string[])) cache.set(r, { id: r });
      },
      remove: async (ids: unknown) => {
        for (const r of ([] as string[]).concat(ids as string[])) cache.delete(r);
      },
    },
    permissions: { has: () => false },
  };
  return member;
}

async function seed(): Promise<void> {
  await Promise.all([RoleConfigModel.syncIndexes(), FastAccessModel.syncIndexes()]);
  await roleConfigService.setRole({ guildId: GUILD, roleId: GENERAL, type: RoleConfigType.STAFF });
  await roleConfigService.setRole({ guildId: GUILD, roleId: BLACKLIST, type: RoleConfigType.BLACKLIST });
  await roleConfigService.setRole({ guildId: GUILD, roleId: WARN[1], type: RoleConfigType.WARN_1 });
  await roleConfigService.setRole({ guildId: GUILD, roleId: WARN[2], type: RoleConfigType.WARN_2 });
  await roleConfigService.setRole({ guildId: GUILD, roleId: WARN[3], type: RoleConfigType.WARN_3 });
  await roleConfigService.rebuildLadder(GUILD, LADDER);
  await channelConfigService.set({ guildId: GUILD, type: ChannelConfigType.USER_WARNS, channelId: "user-warns-ch" });
  await channelConfigService.set({ guildId: GUILD, type: ChannelConfigType.STAFF_WARNS, channelId: "staff-warns-ch" });
}

async function cleanup(): Promise<void> {
  await Promise.all([
    RoleConfigModel.deleteMany({ guildId: GUILD }),
    ChannelConfigModel.deleteMany({ guildId: GUILD }),
    FastAccessModel.deleteMany({ guildId: GUILD }),
    StaffModel.deleteMany({ guildId: GUILD }),
    StaffPointTransactionModel.deleteMany({ reason: /itest|warning/i }),
    StaffActivityModel.deleteMany({}),
    StaffHistoryModel.deleteMany({}),
    UserWarningModel.deleteMany({ guildId: GUILD }),
    StaffWarningModel.deleteMany({}),
  ]);
}

describe.skipIf(!hasDb)("prefix commands — services (MongoDB)", () => {
  beforeAll(seed);
  afterAll(async () => {
    await cleanup();
    await mongoose.disconnect();
  });

  it("!accept assigns roles 0..level + general Staff and sets ACTIVE status", async () => {
    const member = fakeMember("staff-accept-1");
    const result = await staffManagementService.accept(member as never, "manager-1", 2);

    expect(result.level).toBe(2);
    expect([...member.roles.cache.keys()].sort()).toEqual(["r0", "r1", "r2", GENERAL].sort());

    const staff = await staffService.get("staff-accept-1", GUILD);
    expect(staff?.status).toBe(StaffStatus.ACTIVE);
    expect(staff?.currentRoleLevel).toBe(2);
  });

  it("!prompt / !demote move the level and never exceed END or go below 0", async () => {
    const member = fakeMember("staff-move-1");
    await staffManagementService.accept(member as never, "m", 0);

    const up = await staffManagementService.promote(member as never, "m", 5);
    expect(up.to).toBe(3);
    expect(member.roles.cache.has("r3")).toBe(true);

    const down = await staffManagementService.demote(member as never, "m", 2);
    expect(down.to).toBe(1);
    expect(member.roles.cache.has("r3")).toBe(false);
    expect(member.roles.cache.has("r1")).toBe(true);

    const floor = await staffManagementService.demote(member as never, "m", 9);
    expect(floor.to).toBe(0);
    expect(member.roles.cache.has(GENERAL)).toBe(true);
  });

  it("!fire (normal) strips staff roles, gives NO blacklist and NO break, sets FIRED", async () => {
    const member = fakeMember("staff-fire-1");
    await staffManagementService.accept(member as never, "m", 3);
    await staffManagementService.fire(member as never, "m", false);

    expect(member.roles.cache.has(BLACKLIST)).toBe(false);
    expect([...member.roles.cache.keys()].some((r) => LADDER.includes(r))).toBe(false);
    expect(member.roles.cache.has(GENERAL)).toBe(false);
    const staff = await staffService.get("staff-fire-1", GUILD);
    expect(staff?.status).toBe(StaffStatus.FIRED);
  });

  it("!fire = / blacklist strips staff roles and adds the Blacklist role, sets BLACKLISTED", async () => {
    const member = fakeMember("staff-fire-bl");
    await staffManagementService.accept(member as never, "m", 2);
    await staffManagementService.fire(member as never, "m", true);

    expect(member.roles.cache.has(BLACKLIST)).toBe(true);
    expect([...member.roles.cache.keys()].some((r) => LADDER.includes(r))).toBe(false);
    expect(member.roles.cache.has(GENERAL)).toBe(false);
    const staff = await staffService.get("staff-fire-bl", GUILD);
    expect(staff?.status).toBe(StaffStatus.BLACKLISTED);
  });

  it("!warn (user) creates a UserWarning + issuer +1 USER_WARNING point, once", async () => {
    const issuer = fakeMember("issuer-u");
    const r1 = await warningActionService.issueUserWarning({
      guildId: GUILD,
      targetId: "victim-1",
      reason: "spam",
      issuer: issuer as never,
      evidence: ["https://x/1.png"],
    });

    const warning = await UserWarningModel.findById(r1.warningId).exec();
    expect(warning?.userId).toBe("victim-1");
    expect(warning?.status).toBe("ACTIVE");

    const issuerStaff = await staffService.get("issuer-u", GUILD);
    const txns = await StaffPointTransactionModel.countDocuments({
      staffId: issuerStaff!._id,
      type: StaffPointTransactionType.USER_WARNING,
      referenceId: r1.warningId,
    }).exec();
    expect(txns).toBe(1);
  });

  async function verbal(target: FakeMember, manager: FakeMember, reason: string) {
    return warningActionService.issueVerbalStaffWarning({
      guild: target.guild,
      target: target as never,
      reason,
      issuer: manager as never,
      evidence: [],
    });
  }

  it("normal staff: 3 verbal warnings convert into Real Warning #1 + Warn 1 role, no fire", async () => {
    const target = fakeMember("staff-verbal-1");
    await staffManagementService.accept(target as never, "m", 2);
    const manager = fakeMember("manager-sw");

    let last = await verbal(target, manager, "1");
    expect(last.escalation).toBeUndefined();
    last = await verbal(target, manager, "2");
    expect(last.escalation).toBeUndefined();
    last = await verbal(target, manager, "3");

    expect(last.escalation?.level).toBe(1);
    expect(last.escalation?.fired).toBe(false);
    expect(target.roles.cache.has(WARN[1])).toBe(true);

    const managerStaff = await staffService.get("manager-sw", GUILD);
    const points = await StaffPointTransactionModel.countDocuments({
      staffId: managerStaff!._id,
      type: StaffPointTransactionType.STAFF_WARNING,
    }).exec();
    expect(points).toBe(3);

    const targetStaff = await staffService.get("staff-verbal-1", GUILD);
    const converted = await StaffWarningModel.countDocuments({
      staffId: targetStaff!._id,
      type: "VERBAL",
      status: "CONVERTED",
    }).exec();
    expect(converted).toBe(3);
  });

  it("normal staff: 9 verbal warnings escalate to Warn 3 then Fire + Blacklist", async () => {
    const target = fakeMember("staff-verbal-9");
    await staffManagementService.accept(target as never, "m", 2);
    const manager = fakeMember("manager-sw9");

    let last;
    for (let i = 1; i <= 9; i++) last = await verbal(target, manager, `v${i}`);

    expect(last!.escalation?.level).toBe(3);
    expect(last!.escalation?.fired).toBe(true);
    expect(last!.escalation?.blacklisted).toBe(true);
    expect(target.roles.cache.has(BLACKLIST)).toBe(true);
    expect(target.roles.cache.has(WARN[3])).toBe(false);
    const staff = await staffService.get("staff-verbal-9", GUILD);
    expect(staff?.status).toBe(StaffStatus.BLACKLISTED);
  });

  it("new staff (level 0): first real warning fires + blacklists immediately, no Break", async () => {
    const target = fakeMember("staff-new-0");
    await staffManagementService.accept(target as never, "m", 0);
    const manager = fakeMember("manager-new");

    let last;
    for (let i = 1; i <= 3; i++) last = await verbal(target, manager, `n${i}`);

    expect(last!.escalation?.level).toBe(1);
    expect(last!.escalation?.fired).toBe(true);
    expect(target.roles.cache.has(BLACKLIST)).toBe(true);
    expect(target.roles.cache.has(WARN[1])).toBe(false);
    const staff = await staffService.get("staff-new-0", GUILD);
    expect(staff?.status).toBe(StaffStatus.BLACKLISTED);
  });

  it("!unwarn on a real warning marks it REMOVED (never deletes) and recalculates the warn role", async () => {
    const target = fakeMember("staff-unwarn-1");
    await staffManagementService.accept(target as never, "m", 2);
    const manager = fakeMember("manager-uw");

    let last;
    for (let i = 1; i <= 6; i++) last = await verbal(target, manager, `u${i}`);
    const realId = last!.escalation!.realWarningId;
    expect(last!.escalation?.level).toBe(2);
    expect(target.roles.cache.has(WARN[2])).toBe(true);

    const res = await warningActionService.revokeWarning({
      guild: target.guild,
      warningId: realId,
      targetId: "staff-unwarn-1",
      actor: manager as never,
      isStaffManager: true,
      reason: "appeal ok",
    });
    expect(res.kind).toBe("STAFF_REAL");

    const stillThere = await StaffWarningModel.findById(realId).exec();
    expect(stillThere).not.toBeNull();
    expect(stillThere?.status).toBe("REMOVED");
    expect(target.roles.cache.has(WARN[2])).toBe(false);
    expect(target.roles.cache.has(WARN[1])).toBe(true);
  });

  it("!unwarn on a verbal warning marks it REVOKED and it no longer counts toward conversion", async () => {
    const target = fakeMember("staff-unwarn-v");
    await staffManagementService.accept(target as never, "m", 2);
    const manager = fakeMember("manager-uwv");

    const v1 = await verbal(target, manager, "keep-1");
    await verbal(target, manager, "keep-2");

    const res = await warningActionService.revokeWarning({
      guild: target.guild,
      warningId: v1.verbalWarningId,
      targetId: "staff-unwarn-v",
      actor: manager as never,
      isStaffManager: true,
    });
    expect(res.kind).toBe("STAFF_VERBAL");

    const last = await verbal(target, manager, "keep-3");
    expect(last.escalation).toBeUndefined();

    const doc = await StaffWarningModel.findById(v1.verbalWarningId).exec();
    expect(doc?.status).toBe("REVOKED");
  });

  it("Fast Access: guild+command is unique; duplicate add is rejected", async () => {
    await fastAccessService.create({
      guildId: GUILD,
      command: "rules",
      message: "read the rules",
      contextType: FastAccessContext.MODMAIL,
      createdBy: "m",
    });
    expect(await fastAccessService.existsForCommand(GUILD, "$RULES")).toBe(true);
    expect((await fastAccessService.getByCommand(GUILD, "Rules"))?.command).toBe("rules");
    await expect(
      fastAccessService.create({
        guildId: GUILD,
        command: "$rules",
        message: "dupe",
        contextType: FastAccessContext.SUPPORT,
        createdBy: "m",
      }),
    ).rejects.toThrow();
  });
});
