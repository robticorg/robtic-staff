import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mongoose, { Types } from "mongoose";
import { config } from "../../../config/index.ts";
import { GiftClaimAuditModel } from "../../gift-claims/models/gift-claim-audit.model.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import { StaffActivityType, StaffPointTransactionType, StaffStatus } from "../../staff/types/enums.ts";
import { TicketModel } from "../../tickets/models/ticket.model.ts";
import { TicketStatus } from "../../tickets/types/enums.ts";
import { StatsPeriod } from "../types/enums.ts";
import { resolveStatsRange } from "../utils/date-range.ts";
import { staffStatisticsService } from "../services/staff-statistics.service.ts";

const TEST_DB = `${config.mongoDbName}_test`;
async function ensureConnected(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(config.mongoUri, { dbName: TEST_DB, serverSelectionTimeoutMS: 1500 });
    return true;
  } catch {
    return false;
  }
}
const hasDb = await ensureConnected();

const GUILD = "stats-itest-guild";
const GUILD2 = "stats-itest-guild-2";

async function makeStaff(
  userId: string,
  guildId = GUILD,
  status: StaffStatus = StaffStatus.ACTIVE,
  level = 1,
): Promise<Types.ObjectId> {
  const s = await StaffModel.create({ userId, guildId, status, currentRoleLevel: level });
  return s._id;
}

async function addPoints(
  staffId: Types.ObjectId,
  amount: number,
  when: Date,
  type: StaffPointTransactionType = StaffPointTransactionType.REPORT_CLAIM,
  ref?: string,
) {
  await StaffPointTransactionModel.create({
    staffId,
    amount,
    type,
    referenceId: ref ?? `${type}-${Math.random()}`,
    reason: "itest",
    createdAt: when,
  });
}

async function addActivity(
  staffId: Types.ObjectId,
  type: StaffActivityType,
  when: Date = new Date(),
) {
  await StaffActivityModel.create({ staffId, type, createdAt: when });
}

async function cleanup(): Promise<void> {
  await Promise.all([
    StaffModel.deleteMany({ guildId: { $in: [GUILD, GUILD2] } }),
    StaffPointTransactionModel.deleteMany({ reason: "itest" }),
    StaffActivityModel.deleteMany({}),
    TicketModel.deleteMany({ guildId: { $in: [GUILD, GUILD2] } }),
    GiftClaimAuditModel.deleteMany({ guildId: { $in: [GUILD, GUILD2] } }),
  ]);
}

describe.skipIf(!hasDb)("Staff statistics (aggregation over existing data)", () => {
  beforeAll(async () => {
    await ensureConnected();
    await Promise.all([
      StaffModel.syncIndexes(),
      StaffPointTransactionModel.syncIndexes(),
      StaffActivityModel.syncIndexes(),
    ]);
  });
  afterAll(cleanup);
  beforeEach(async () => {
    await ensureConnected();
    await cleanup();
  });
  afterEach(cleanup);

  it("sums StaffPointTransaction per period; negatives reduce the total", async () => {
    const now = new Date();
    const staff = await makeStaff("pts-1");
    const monthStart = resolveStatsRange(StatsPeriod.THIS_MONTH).start!;
    const eightDaysAgo = new Date(now.getTime() - 8 * 86_400_000);
    const inMonth = monthStart.getTime() <= eightDaysAgo.getTime();

    await addPoints(staff, 5, now);
    await addPoints(staff, -2, now, StaffPointTransactionType.APPEAL_SUCCESS_PENALTY);
    await addPoints(staff, 10, eightDaysAgo);
    await addPoints(staff, 3, new Date(now.getTime() - 100 * 86_400_000));

    const stats = await staffStatisticsService.getStaffStats({
      guildId: GUILD,
      staffId: "pts-1",
      period: StatsPeriod.ALL_TIME,
    });
    expect(stats.points.today).toBe(3);
    expect(stats.points.week).toBe(3);
    expect(stats.points.month).toBe(inMonth ? 13 : 3);
    expect(stats.points.allTime).toBe(16);
  });

  it("getPointStats returns a per-type breakdown for the period", async () => {
    const staff = await makeStaff("pts-2");
    const now = new Date();
    await addPoints(staff, 1, now, StaffPointTransactionType.REPORT_CLAIM);
    await addPoints(staff, 1, now, StaffPointTransactionType.TICKET_CLAIM);
    await addPoints(staff, -2, now, StaffPointTransactionType.APPEAL_SUCCESS_PENALTY);

    const r = await staffStatisticsService.getPointStats({
      guildId: GUILD,
      staffId: "pts-2",
      period: StatsPeriod.TODAY,
    });
    expect(r.total).toBe(0);
    expect(r.breakdown.REPORT_CLAIM).toBe(1);
    expect(r.breakdown.APPEAL_SUCCESS_PENALTY).toBe(-2);
  });

  it("ranks by points DESC → activity DESC → staffId ASC; excludes fired/blacklisted; keeps break", async () => {
    const now = new Date();
    const a = await makeStaff("sA-mid");
    const c = await makeStaff("sC-aaa");
    const b = await makeStaff("sZ-zzz");
    await makeStaff("sD-fired", GUILD, StaffStatus.FIRED);
    const e = await makeStaff("sE-break", GUILD, StaffStatus.BREAK);
    const f = await makeStaff("sF-zero");
    const g = await makeStaff("sG-neg");
    const other = await makeStaff("sX-other", GUILD2);

    for (const s of [a, b, c]) await addPoints(s, 42, now);
    await addPoints(e, 1, now);
    await addPoints(g, -5, now);
    await addPoints(other, 999, now);

    for (let i = 0; i < 5; i++) await addActivity(a, StaffActivityType.TICKET_CLAIM, now);
    for (let i = 0; i < 3; i++) await addActivity(b, StaffActivityType.TICKET_CLAIM, now);
    for (let i = 0; i < 3; i++) await addActivity(c, StaffActivityType.TICKET_CLAIM, now);

    const lb = await staffStatisticsService.getLeaderboard({
      guildId: GUILD,
      period: StatsPeriod.ALL_TIME,
      limit: 20,
    });
    const order = lb.entries.map((x) => x.staffId);

    expect(order).not.toContain("sD-fired");
    expect(order).not.toContain("sX-other");
    expect(order).toEqual(["sA-mid", "sC-aaa", "sZ-zzz", "sE-break", "sF-zero", "sG-neg"]);
    expect(lb.entries[0]).toMatchObject({ rank: 1, points: 42, activityCount: 5 });
    expect(lb.entries.at(-1)).toMatchObject({ staffId: "sG-neg", points: -5 });
  });

  it("leaderboard limit + totalRanked", async () => {
    const now = new Date();
    for (const id of ["l1", "l2", "l3", "l4"]) {
      const s = await makeStaff(id);
      await addPoints(s, 10, now);
    }
    const lb = await staffStatisticsService.getLeaderboard({ guildId: GUILD, limit: 2 });
    expect(lb.entries).toHaveLength(2);
    expect(lb.totalRanked).toBe(4);
    expect(lb.entries[0]?.rank).toBe(1);
    expect(lb.entries[1]?.rank).toBe(2);
  });

  it("a gift-claim ticket is one ticket AND its gift-claim audit is separate", async () => {
    const now = new Date();
    const staffId = await makeStaff("gc-staff");
    await TicketModel.create({
      ticketId: "ticket-gc-1",
      guildId: GUILD,
      channelId: "chan-1",
      userId: "claimant",
      panelId: "gift-claim",
      claimedBy: staffId,
      claimedByDiscordId: "gc-staff",
      status: TicketStatus.CLAIMED,
      claimedAt: now,
    });
    await GiftClaimAuditModel.create({
      claimId: "claim-1",
      guildId: GUILD,
      actorId: "gc-staff",
      action: "GIFT_CLAIM_FULFILLED",
      createdAt: now,
    });
    await GiftClaimAuditModel.create({
      claimId: "claim-1",
      guildId: GUILD,
      actorId: "gc-staff",
      action: "GIFT_CLAIM_APPROVED",
      createdAt: now,
    });

    const stats = await staffStatisticsService.getStaffStats({
      guildId: GUILD,
      staffId: "gc-staff",
      period: StatsPeriod.ALL_TIME,
    });
    expect(stats.activity.ticketsClaimed).toBe(1);
    expect(stats.activity.ticketsByPanel["gift-claim"]).toBe(1);
    expect(stats.activity.giftClaimsFulfilled).toBe(1);
    expect(stats.activity.giftClaimsApproved).toBe(1);
    expect(stats.activity.giftClaimsHandled).toBe(1);
  });

  it("zero-activity staff → found with all-zero stats", async () => {
    await makeStaff("empty-1");
    const stats = await staffStatisticsService.getStaffStats({ guildId: GUILD, staffId: "empty-1" });
    expect(stats.found).toBe(true);
    expect(stats.points.allTime).toBe(0);
    expect(stats.activity.total).toBe(0);
    expect(stats.recentActivity).toEqual([]);
  });

  it("unknown staff → { found: false }", async () => {
    const stats = await staffStatisticsService.getStaffStats({ guildId: GUILD, staffId: "ghost" });
    expect(stats.found).toBe(false);
  });

  it("activity counters come from StaffActivity by type (§7); detailed adds point history (§16)", async () => {
    const now = new Date();
    const staffId = await makeStaff("act-1");
    await addActivity(staffId, StaffActivityType.VACATION_APPROVED, now);
    await addActivity(staffId, StaffActivityType.VACATION_REJECTED, now);
    await addActivity(staffId, StaffActivityType.USER_WARNING, now);
    await addPoints(staffId, 1, now, StaffPointTransactionType.USER_WARNING, "w-1");

    const summary = await staffStatisticsService.getStaffStats({
      guildId: GUILD,
      staffId: "act-1",
      detailed: false,
    });
    expect(summary.activity.vacationsApproved).toBe(1);
    expect(summary.activity.vacationsRejected).toBe(1);
    expect(summary.activity.byType.USER_WARNING).toBe(1);
    expect(summary.pointHistory).toBeUndefined();

    const detailed = await staffStatisticsService.getStaffStats({
      guildId: GUILD,
      staffId: "act-1",
      detailed: true,
    });
    expect(detailed.pointHistory?.length).toBe(1);
    expect(detailed.pointHistory?.[0]?.type).toBe("USER_WARNING");
  });
});
