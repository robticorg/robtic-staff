import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";
import {
  getHierarchy,
  invalidateStaffHierarchy,
} from "../../configuration/utils/staff-levels.ts";
import { buildRoleCheckView } from "../../../commands/role/check.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffActivityModel } from "../models/staff-activity.model.ts";
import { StaffHistoryModel } from "../models/staff-history.model.ts";
import { StaffStatus } from "../types/enums.ts";
import { StaffScanError, staffScanService } from "../services/staff-scan.service.ts";

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

const GUILD = "scan-itest-guild";
const OTHER_GUILD = "scan-itest-other";

const R_STAFF = "role1";
const R_START = "role2";
const R_L1 = "role3";
const R_IGNORE = "role4";
const R_L2 = "role5";
const R_HIGH = "role6";
const R_L4 = "role7";
const R_OWNER = "role9";
const R_SHIP = "role11";
const R_END = "role13";
const R_BLACKLIST = "role-blacklist";
const R_COMMUNITY = "role-community";

class RoleCache extends Map<string, { id: string }> {
  some(fn: (v: { id: string }) => boolean): boolean {
    for (const v of this.values()) if (fn(v)) return true;
    return false;
  }
}

interface FakeMember {
  id: string;
  user: { bot: boolean };
  roles: { cache: RoleCache };
}

function makeGuild(id = GUILD) {
  const members = new Map<string, FakeMember>();
  return {
    id,
    members: {
      _members: members,

      fetch: async () => members,
    },
  };
}

function addMember(
  guild: ReturnType<typeof makeGuild>,
  id: string,
  roleIds: string[],
  bot = false,
): FakeMember {
  const cache = new RoleCache();
  for (const r of roleIds) cache.set(r, { id: r });
  const member: FakeMember = { id, user: { bot }, roles: { cache } };
  guild.members._members.set(id, member);
  return member;
}

async function seedHierarchy(guildId = GUILD, withBoundaries = true): Promise<void> {
  await RoleConfigModel.deleteMany({ guildId });
  await RoleConfigModel.create([
    { guildId, roleId: R_STAFF, type: RoleConfigType.STAFF },
    { guildId, roleId: R_START, type: RoleConfigType.START, level: 0 },
    { guildId, roleId: R_L1, type: RoleConfigType.STAFF, level: 1 },
    { guildId, roleId: R_IGNORE, type: RoleConfigType.IGNORE },
    { guildId, roleId: R_L2, type: RoleConfigType.STAFF, level: 2 },
    {
      guildId,
      roleId: R_HIGH,
      type: RoleConfigType.STAFF,
      level: 3,
      ...(withBoundaries ? { boundary: StaffTier.HIGHSTAFF } : {}),
    },
    { guildId, roleId: R_L4, type: RoleConfigType.STAFF, level: 4 },
    {
      guildId,
      roleId: R_OWNER,
      type: RoleConfigType.STAFF,
      level: 6,
      ...(withBoundaries ? { boundary: StaffTier.OWNER } : {}),
    },
    {
      guildId,
      roleId: R_SHIP,
      type: RoleConfigType.STAFF,
      level: 8,
      ...(withBoundaries ? { boundary: StaffTier.SHIP } : {}),
    },
    { guildId, roleId: R_END, type: RoleConfigType.END, level: 10 },
    { guildId, roleId: R_BLACKLIST, type: RoleConfigType.BLACKLIST },
  ]);
  invalidateStaffHierarchy(guildId);
}

const scan = (guild: ReturnType<typeof makeGuild>) =>
  staffScanService.scan({ guild: guild as never, actorId: "manager-1" });

describe.skipIf(!hasDb)("Staff scan (MongoDB + Discord fakes)", () => {
  let guild: ReturnType<typeof makeGuild>;

  beforeEach(async () => {
    guild = makeGuild();
    await seedHierarchy();
    await Promise.all([
      StaffModel.deleteMany({ guildId: GUILD }),
      StaffModel.deleteMany({ guildId: OTHER_GUILD }),
      StaffActivityModel.deleteMany({}),
      StaffHistoryModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      StaffModel.deleteMany({ guildId: GUILD }),
      StaffModel.deleteMany({ guildId: OTHER_GUILD }),
      RoleConfigModel.deleteMany({ guildId: GUILD }),
      RoleConfigModel.deleteMany({ guildId: OTHER_GUILD }),
    ]);
  });

  it("reports nothing when no member holds the Staff role", async () => {
    addMember(guild, "u-community", [R_COMMUNITY]);

    const report = await scan(guild);

    expect(report.found).toBe(0);
    expect(report.created).toBe(0);
    expect(await StaffModel.countDocuments({ guildId: GUILD })).toBe(0);
  });

  it("imports a single existing staff member at their Discord level", async () => {
    addMember(guild, "u-1", [R_STAFF, R_START, R_L1]);

    const report = await scan(guild);

    expect(report.found).toBe(1);
    expect(report.created).toBe(1);
    const staff = await StaffModel.findOne({ guildId: GUILD, userId: "u-1" }).exec();
    expect(staff!.currentRoleLevel).toBe(1);
    expect(staff!.status).toBe(StaffStatus.ACTIVE);
  });

  it("imports many members at once", async () => {
    addMember(guild, "u-1", [R_STAFF, R_START]);
    addMember(guild, "u-2", [R_STAFF, R_L2]);
    addMember(guild, "u-3", [R_STAFF, R_HIGH]);

    const report = await scan(guild);

    expect(report.found).toBe(3);
    expect(report.created).toBe(3);
    const levels = Object.fromEntries(
      (await StaffModel.find({ guildId: GUILD }).exec()).map((s) => [s.userId, s.currentRoleLevel]),
    );
    expect(levels).toEqual({ "u-1": 0, "u-2": 2, "u-3": 3 });
  });

  it("takes the highest numbered role when a member has several (§8)", async () => {
    addMember(guild, "u-1", [R_STAFF, R_START, R_L1, R_L2, R_HIGH]);

    await scan(guild);

    const staff = await StaffModel.findOne({ guildId: GUILD, userId: "u-1" }).exec();
    expect(staff!.currentRoleLevel).toBe(3);
  });

  it("never counts an ignored role as a level (§3)", async () => {
    addMember(guild, "u-ignored-top", [R_STAFF, R_L2, R_IGNORE]);
    addMember(guild, "u-only-ignored", [R_STAFF, R_IGNORE]);

    const report = await scan(guild);

    const staff = await StaffModel.findOne({ guildId: GUILD, userId: "u-ignored-top" }).exec();
    expect(staff!.currentRoleLevel).toBe(2);

    expect(report.invalid).toBe(1);
    expect(report.invalidMembers).toEqual(["u-only-ignored"]);
  });

  it("refuses to guess a level for a member with no numbered role (§7)", async () => {
    addMember(guild, "u-bare", [R_STAFF]);

    const report = await scan(guild);

    expect(report.found).toBe(1);
    expect(report.invalid).toBe(1);
    expect(report.created).toBe(0);

    expect(await StaffModel.countDocuments({ guildId: GUILD, userId: "u-bare" })).toBe(0);
  });

  it("updates an existing record's level without touching its history (§4, §5)", async () => {
    const created = await StaffModel.create({
      guildId: GUILD,
      userId: "u-1",
      status: StaffStatus.ACTIVE,
      currentRoleLevel: 0,
      points: 120,
      reportsClaimed: 7,
      ticketsCompleted: 4,
      giftClaimsHandled: 2,
      warningsIssued: 3,
    });
    addMember(guild, "u-1", [R_STAFF, R_HIGH]);

    const report = await scan(guild);

    expect(report.updated).toBe(1);
    expect(report.created).toBe(0);
    const after = await StaffModel.findById(created._id).exec();
    expect(after!.currentRoleLevel).toBe(3);

    expect(after!.points).toBe(120);
    expect(after!.reportsClaimed).toBe(7);
    expect(after!.ticketsCompleted).toBe(4);
    expect(after!.giftClaimsHandled).toBe(2);
    expect(after!.warningsIssued).toBe(3);
  });

  it("counts an already-correct member as unchanged", async () => {
    await StaffModel.create({
      guildId: GUILD,
      userId: "u-1",
      status: StaffStatus.ACTIVE,
      currentRoleLevel: 3,
    });
    addMember(guild, "u-1", [R_STAFF, R_HIGH]);

    const report = await scan(guild);

    expect(report.unchanged).toBe(1);
    expect(report.updated).toBe(0);
    expect(report.created).toBe(0);
  });

  it("does not flip an existing FIRED record back to ACTIVE (§25, §26)", async () => {
    await StaffModel.create({
      guildId: GUILD,
      userId: "u-1",
      status: StaffStatus.FIRED,
      currentRoleLevel: 0,
    });
    addMember(guild, "u-1", [R_STAFF, R_L2]);

    await scan(guild);

    const after = await StaffModel.findOne({ guildId: GUILD, userId: "u-1" }).exec();
    expect(after!.status).toBe(StaffStatus.FIRED);
    expect(after!.currentRoleLevel).toBe(2);
  });

  it("never imports a blacklisted member who has no Staff role (§25)", async () => {
    addMember(guild, "u-blacklisted", [R_BLACKLIST, R_L2]);

    const report = await scan(guild);

    expect(report.found).toBe(0);
    expect(await StaffModel.countDocuments({ guildId: GUILD, userId: "u-blacklisted" })).toBe(0);
  });

  it("skips bots", async () => {
    addMember(guild, "a-bot", [R_STAFF, R_L2], true);

    expect((await scan(guild)).found).toBe(0);
  });

  it("creates no duplicates when scanned twice (§12)", async () => {
    addMember(guild, "u-1", [R_STAFF, R_HIGH]);

    const first = await scan(guild);
    const second = await scan(guild);

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    expect(second.unchanged).toBe(1);
    expect(await StaffModel.countDocuments({ guildId: GUILD, userId: "u-1" })).toBe(1);
  });

  it("serialises concurrent scans of the same guild (§12)", async () => {
    for (let i = 0; i < 5; i += 1) addMember(guild, `u-${i}`, [R_STAFF, R_L2]);

    const results = await Promise.allSettled([scan(guild), scan(guild)]);

    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(StaffScanError);
    expect(await StaffModel.countDocuments({ guildId: GUILD })).toBe(5);
  });

  it("isolates guilds (§10)", async () => {
    const other = makeGuild(OTHER_GUILD);
    await seedHierarchy(OTHER_GUILD);
    addMember(guild, "u-multi", [R_STAFF, R_HIGH]);
    addMember(other, "u-multi", [R_STAFF, R_START]);

    await scan(guild);
    await scan(other);

    const here = await StaffModel.findOne({ guildId: GUILD, userId: "u-multi" }).exec();
    const there = await StaffModel.findOne({ guildId: OTHER_GUILD, userId: "u-multi" }).exec();
    expect(here!.currentRoleLevel).toBe(3);
    expect(there!.currentRoleLevel).toBe(0);
  });

  it("handles a large member list in one pass (§11)", async () => {
    for (let i = 0; i < 600; i += 1) {
      addMember(guild, `bulk-${i}`, [R_STAFF, i % 2 === 0 ? R_L2 : R_HIGH]);
    }

    const report = await scan(guild);

    expect(report.found).toBe(600);
    expect(report.created).toBe(600);
    expect(await StaffModel.countDocuments({ guildId: GUILD })).toBe(600);
    const sample = await StaffModel.findOne({ guildId: GUILD, userId: "bulk-1" }).exec();
    expect(sample!.currentRoleLevel).toBe(3);
  });

  it("ignores a role that was deleted from the configuration", async () => {
    await RoleConfigModel.deleteOne({ guildId: GUILD, roleId: R_L4 });
    invalidateStaffHierarchy(GUILD);
    addMember(guild, "u-1", [R_STAFF, R_L2, R_L4]);

    await scan(guild);

    const staff = await StaffModel.findOne({ guildId: GUILD, userId: "u-1" }).exec();
    expect(staff!.currentRoleLevel).toBe(2);
  });

  it("refuses to scan when the hierarchy is invalid (§19)", async () => {
    await RoleConfigModel.deleteOne({ guildId: GUILD, roleId: R_END });
    invalidateStaffHierarchy(GUILD);
    addMember(guild, "u-1", [R_STAFF, R_L2]);

    await expect(scan(guild)).rejects.toThrow(StaffScanError);
    expect(await StaffModel.countDocuments({ guildId: GUILD })).toBe(0);
  });

  it("refuses to scan when the general Staff role is unset", async () => {
    await RoleConfigModel.deleteOne({ guildId: GUILD, roleId: R_STAFF });
    invalidateStaffHierarchy(GUILD);

    const err = await scan(guild).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(StaffScanError);
    expect((err as StaffScanError).code).toBe("SCAN_STAFF_ROLE_UNSET");
  });

  it("stores exactly the level /role check reports for the same role (§18)", async () => {
    addMember(guild, "u-1", [R_STAFF, R_HIGH]);
    await scan(guild);

    const hierarchy = await getHierarchy(GUILD);
    const view = buildRoleCheckView(hierarchy, R_HIGH);
    const staff = await StaffModel.findOne({ guildId: GUILD, userId: "u-1" }).exec();

    expect(view.ok).toBe(true);
    expect(view.lines.join("\n")).toContain(`المستوى: **${staff!.currentRoleLevel}**`);
    expect(view.lines.join("\n")).toContain("هاي ستاف");
  });
});

describe.skipIf(!hasDb)("/role check views", () => {
  beforeEach(async () => {
    await seedHierarchy();
  });

  afterAll(async () => {
    await RoleConfigModel.deleteMany({ guildId: GUILD });
  });

  const view = async (roleId: string) => buildRoleCheckView(await getHierarchy(GUILD), roleId);

  it("shows the START role at level 0 (§17)", async () => {
    const text = (await view(R_START)).lines.join("\n");
    expect(text).toContain("المستوى: **0**");
    expect(text).toContain("ستاف");
    expect(text).toContain("بداية سلّم الستاف");
  });

  it("shows a normal numbered role with its tier", async () => {
    const text = (await view(R_L4)).lines.join("\n");
    expect(text).toContain("المستوى: **4**");
    expect(text).toContain("هاي ستاف");
  });

  it("labels the HIGHSTAFF, OWNER and SHIP boundary roles (§17)", async () => {
    expect((await view(R_HIGH)).lines.join("\n")).toContain("بداية مستوى الهاي ستاف");
    expect((await view(R_OWNER)).lines.join("\n")).toContain("بداية مستوى الأونر");
    expect((await view(R_SHIP)).lines.join("\n")).toContain("بداية مستوى الشيب");
  });

  it("shows the END role at the maximum level", async () => {
    const text = (await view(R_END)).lines.join("\n");
    expect(text).toContain("المستوى: **10**");
    expect(text).toContain("نهاية سلّم الستاف");
  });

  it("marks an ignored role as excluded with no level (§15)", async () => {
    const text = (await view(R_IGNORE)).lines.join("\n");
    expect(text).toContain("مستثناة");
    expect(text).toContain("المستوى: لا يوجد");
    expect(text).not.toContain("التصنيف");
  });

  it("marks a non-staff role as outside the ladder (§16)", async () => {
    const text = (await view(R_COMMUNITY)).lines.join("\n");
    expect(text).toContain("ليست ضمن مستويات الستاف");
    expect(text).not.toContain("المستوى: **");
  });

  it("refuses to show a level when the hierarchy is broken (§19)", async () => {
    await RoleConfigModel.deleteOne({ guildId: GUILD, roleId: R_START });
    invalidateStaffHierarchy(GUILD);

    const result = await view(R_L4);
    expect(result.ok).toBe(false);
    expect(result.lines.join("\n")).toContain("رتبة البداية مو مضبوطة");
  });
});
