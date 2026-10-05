import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import mongoose from "mongoose";
import { config } from "../../../config/index.ts";
import { RoleConfigModel } from "../../configuration/models/role-config.model.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { StaffTier } from "../../configuration/types/enums.ts";
import { invalidateStaffHierarchy } from "../../configuration/utils/staff-levels.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffHistoryModel } from "../models/staff-history.model.ts";
import { staffProfileLines } from "../render/staff-profile-card.ts";
import { staffProfileService } from "../services/staff-profile.service.ts";
import { StaffHistoryAction, StaffStatus } from "../types/enums.ts";

const ACCEPTER = "111111111111111111";
const PROMOTER = "222222222222222222";

describe("staff profile card", () => {
  const now = new Date("2026-09-27T00:00:00Z");
  const base = {
    userId: "333333333333333333",
    status: StaffStatus.ACTIVE,
    level: 12,
    ladderTop: 40,
    roleId: "444",
    tier: StaffTier.HIGHSTAFF,
    acceptedBy: ACCEPTER,
    acceptedAt: new Date("2026-01-27T00:00:00Z"),
    lastPromotion: { at: new Date("2026-09-20T00:00:00Z"), by: PROMOTER },
  };

  it("shows order, acceptor, time on staff and the last promotion with who did it", () => {
    const lines = staffProfileLines(base, now);
    expect(lines).toContain("**الحالة:** نشط");
    expect(lines).toContain("**ترتيب الرتبة:** المستوى 12 من 40");
    expect(lines).toContain("**الرتبة:** <@&444>");
    expect(lines).toContain("**التصنيف:** ادارة عليا");
    expect(lines).toContain(`**قبله في الطاقم الاداري:** <@${ACCEPTER}>`);
    expect(lines).toContain("**مدة وجوده في الطاقم الاداري:** 8 أشهر");
    expect(lines.some((l) => l.startsWith("**آخر ترقية:**") && l.includes(`<@${PROMOTER}>`))).toBe(true);
  });

  it("says when there was never a promotion or the acceptor was the system", () => {
    const lines = staffProfileLines({ ...base, acceptedBy: null, lastPromotion: null }, now);
    expect(lines).toContain("**قبله في الطاقم الاداري:** النظام");
    expect(lines).toContain("**آخر ترقية:** ما تمت ترقيته من يوم انقبل");
  });
});

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

const GUILD = "profile-itest-guild";
const LADDER = ["p-0", "p-1", "p-2", "p-3"];

describe.skipIf(!hasDb)("staff profile (MongoDB)", () => {
  beforeAll(async () => {
    await RoleConfigModel.deleteMany({ guildId: GUILD });
    await roleConfigService.rebuildLadder(GUILD, LADDER);
    await roleConfigService.setBoundary(GUILD, "p-2", StaffTier.HIGHSTAFF);
    invalidateStaffHierarchy(GUILD);
  });

  afterAll(async () => {
    const staff = await StaffModel.find({ guildId: GUILD }).exec();
    await StaffHistoryModel.deleteMany({ staffId: { $in: staff.map((s) => s._id) } });
    await StaffModel.deleteMany({ guildId: GUILD });
    await RoleConfigModel.deleteMany({ guildId: GUILD });
  });

  it("reads the live level, the acceptor and the latest promotion only", async () => {
    const userId = "555555555555555555";
    const acceptedAt = new Date(Date.now() - 40 * 86_400_000);
    const staff = await StaffModel.create({
      guildId: GUILD,
      userId,
      currentRoleLevel: 1,
      acceptedBy: ACCEPTER,
      acceptedAt,
    });
    await StaffHistoryModel.create([
      { staffId: staff._id, action: StaffHistoryAction.PROMOTE, performedBy: "SYSTEM", createdAt: new Date(Date.now() - 20 * 86_400_000) },
      { staffId: staff._id, action: StaffHistoryAction.PROMOTE, performedBy: PROMOTER, createdAt: new Date(Date.now() - 86_400_000) },
    ]);

    const member = { roles: { cache: new Map(["p-0", "p-1", "p-2"].map((r) => [r, { id: r }])) } };
    const guild = { id: GUILD, members: { fetch: async () => member } };

    const profile = await staffProfileService.get(guild as never, userId);
    expect(profile!.level).toBe(2);
    expect(profile!.ladderTop).toBe(3);
    expect(profile!.roleId).toBe("p-2");
    expect(profile!.tier).toBe(StaffTier.HIGHSTAFF);
    expect(profile!.acceptedBy).toBe(ACCEPTER);
    expect(profile!.acceptedAt!.getTime()).toBe(acceptedAt.getTime());
    expect(profile!.lastPromotion!.by).toBe(PROMOTER);
  });

  it("returns nothing for someone with no staff record", async () => {
    const guild = { id: GUILD, members: { fetch: async () => null } };
    expect(await staffProfileService.get(guild as never, "666666666666666666")).toBeNull();
  });
});
