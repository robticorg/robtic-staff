import type { Types } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { staffService } from "../../staff/services/staff.service.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import {
  StatsPeriod,
  type StatsPeriod as Period,
} from "../types/enums.ts";
import { resolveStatsRange } from "../utils/date-range.ts";
import { statsRepository } from "./stats-repository.ts";

export interface PeriodPoints {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

export interface RecentActivityItem {
  type: string;
  referenceId?: string;
  at: Date;
}

export interface PointHistoryItem {
  type: string;
  amount: number;
  referenceId?: string;
  reason: string;
  at: Date;
}

export interface StaffStatsResult {
  found: boolean;
  staff?: {
    userId: UserId;
    guildId: GuildId;
    status: StaffStatus;
    currentRoleLevel: number;
    roleId: string | null;
  };
  period: Period;
  points: PeriodPoints;
  pointsInPeriod: number;
  activity: {
    total: number;
    byType: Record<string, number>;
    reportsClaimed: number;
    reportsCompleted: number;
    reportsAssignedNow: number;
    ticketsClaimed: number;
    ticketsCompleted: number;
    ticketsAssignedNow: number;
    ticketsByPanel: Record<string, number>;
    giftClaimsHandled: number;
    giftClaimsApproved: number;
    giftClaimsRejected: number;
    giftClaimsFulfilled: number;
    giftClaimsReRequested: number;
    userWarningsIssued: number;
    staffWarningsIssued: number;
    warningsRevoked: number;
    appealsSuccessful: number;
    appealsHandled: number;
    vacationsApproved: number;
    vacationsRejected: number;
  };
  recentActivity: RecentActivityItem[];
  pointHistory?: PointHistoryItem[];
}

export interface LeaderboardEntry {
  rank: number;
  staffId: UserId;
  points: number;
  activityCount: number;
}

export class StaffStatisticsService {

  async getStaffStats(input: {
    guildId: GuildId;
    staffId: UserId;
    period?: Period;
    detailed?: boolean;
  }): Promise<StaffStatsResult> {
    const period = input.period ?? StatsPeriod.THIS_WEEK;
    const staff = await staffService.get(input.staffId, input.guildId);
    if (!staff) {
      return { found: false, period, points: zeroPoints(), pointsInPeriod: 0, activity: zeroActivity(), recentActivity: [] };
    }

    const staffObjId = staff._id as Types.ObjectId;
    const range = resolveStatsRange(period);
    const guildStaff = await statsRepository.guildStaff(input.guildId);
    const guildStaffIds = guildStaff.map((s) => s._id);

    const [
      pToday,
      pWeek,
      pMonth,
      pAll,
      pPeriod,
      byType,
      reports,
      tickets,
      gift,
      warnings,
      recent,
      ladder,
      history,
    ] = await Promise.all([
      statsRepository.pointsForStaff(staffObjId, resolveStatsRange(StatsPeriod.TODAY)),
      statsRepository.pointsForStaff(staffObjId, resolveStatsRange(StatsPeriod.THIS_WEEK)),
      statsRepository.pointsForStaff(staffObjId, resolveStatsRange(StatsPeriod.THIS_MONTH)),
      statsRepository.pointsForStaff(staffObjId, resolveStatsRange(StatsPeriod.ALL_TIME)),
      statsRepository.pointsForStaff(staffObjId, range),
      statsRepository.activityByType(staffObjId, range),
      statsRepository.reportStats(input.guildId, staffObjId, range),
      statsRepository.ticketStats(input.guildId, staffObjId, range),
      statsRepository.giftClaimStats(input.guildId, input.staffId, range),
      statsRepository.warningStats(input.guildId, staffObjId, input.staffId, guildStaffIds, range),
      statsRepository.recentActivity(staffObjId, 10),
      roleConfigService.getStaffRoleLevels(input.guildId),
      input.detailed ? statsRepository.pointTransactions(staffObjId, resolveStatsRange(StatsPeriod.ALL_TIME), 15) : Promise.resolve([]),
    ]);

    const total = Object.values(byType).reduce((a, b) => a + b, 0);
    const roleId = ladder.find((r) => r.level === staff.currentRoleLevel)?.roleId ?? null;

    return {
      found: true,
      staff: {
        userId: staff.userId,
        guildId: staff.guildId,
        status: staff.status,
        currentRoleLevel: staff.currentRoleLevel,
        roleId,
      },
      period,
      points: { today: pToday, week: pWeek, month: pMonth, allTime: pAll },
      pointsInPeriod: pPeriod,
      activity: {
        total,
        byType,
        reportsClaimed: reports.claimed,
        reportsCompleted: reports.completed,
        reportsAssignedNow: reports.assignedNow,
        ticketsClaimed: tickets.claimed,
        ticketsCompleted: tickets.completed,
        ticketsAssignedNow: tickets.assignedNow,
        ticketsByPanel: tickets.byPanel,
        giftClaimsHandled: gift.handled,
        giftClaimsApproved: gift.approved,
        giftClaimsRejected: gift.rejected,
        giftClaimsFulfilled: gift.fulfilled,
        giftClaimsReRequested: gift.reRequested,
        userWarningsIssued: warnings.userWarningsIssued,
        staffWarningsIssued: warnings.staffWarningsIssued,
        warningsRevoked: warnings.warningsRevoked,
        appealsSuccessful: warnings.appealsSuccessful,
        appealsHandled: warnings.appealsHandled,
        vacationsApproved: byType.VACATION_APPROVED ?? 0,
        vacationsRejected: byType.VACATION_REJECTED ?? 0,
      },
      recentActivity: recent.map((a) => ({ type: a.type, referenceId: a.referenceId, at: a.createdAt })),
      pointHistory: input.detailed
        ? history.map((t) => ({
            type: t.type,
            amount: t.amount,
            referenceId: t.referenceId,
            reason: t.reason,
            at: t.createdAt,
          }))
        : undefined,
    };
  }

  async getActivityStats(input: { guildId: GuildId; staffId: UserId; period?: Period }) {
    const period = input.period ?? StatsPeriod.THIS_WEEK;
    const staff = await staffService.get(input.staffId, input.guildId);
    if (!staff) return { found: false, period, total: 0, byType: {} as Record<string, number> };
    const byType = await statsRepository.activityByType(
      staff._id as Types.ObjectId,
      resolveStatsRange(period),
    );
    return { found: true, period, total: Object.values(byType).reduce((a, b) => a + b, 0), byType };
  }

  async getPointStats(input: { guildId: GuildId; staffId: UserId; period?: Period }) {
    const period = input.period ?? StatsPeriod.THIS_WEEK;
    const staff = await staffService.get(input.staffId, input.guildId);
    if (!staff) return { found: false, period, total: 0, breakdown: {} as Record<string, number> };
    const staffObjId = staff._id as Types.ObjectId;
    const range = resolveStatsRange(period);
    const [total, breakdown] = await Promise.all([
      statsRepository.pointsForStaff(staffObjId, range),
      statsRepository.pointBreakdown(staffObjId, range),
    ]);
    return { found: true, period, total, breakdown };
  }

  async getPointsCard(input: { guildId: GuildId; staffId: UserId }): Promise<{
    found: boolean;
    allTime: number;
    week: number;
    weekBreakdown: Record<string, number>;
  }> {
    const staff = await staffService.get(input.staffId, input.guildId);
    if (!staff) return { found: false, allTime: 0, week: 0, weekBreakdown: {} };
    const staffObjId = staff._id as Types.ObjectId;
    const [allTime, week, weekBreakdown] = await Promise.all([
      statsRepository.pointsForStaff(staffObjId, resolveStatsRange(StatsPeriod.ALL_TIME)),
      statsRepository.pointsForStaff(staffObjId, resolveStatsRange(StatsPeriod.THIS_WEEK)),
      statsRepository.pointBreakdown(staffObjId, resolveStatsRange(StatsPeriod.THIS_WEEK)),
    ]);
    return { found: true, allTime, week, weekBreakdown };
  }

  async getRecentActivity(input: {
    guildId: GuildId;
    staffId: UserId;
    limit?: number;
  }): Promise<RecentActivityItem[]> {
    const staff = await staffService.get(input.staffId, input.guildId);
    if (!staff) return [];
    const rows = await statsRepository.recentActivity(
      staff._id as Types.ObjectId,
      Math.min(Math.max(input.limit ?? 10, 1), 50),
    );
    return rows.map((a) => ({ type: a.type, referenceId: a.referenceId, at: a.createdAt }));
  }

  async getLeaderboard(input: {
    guildId: GuildId;
    period?: Period;
    limit?: number;
  }): Promise<{ period: Period; entries: LeaderboardEntry[]; totalRanked: number }> {
    const period = input.period ?? StatsPeriod.THIS_WEEK;
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
    const range = resolveStatsRange(period);

    const staff = await statsRepository.guildStaff(input.guildId, { excludeInactive: true });
    const staffIds = staff.map((s) => s._id);

    const [pointsMap, activityMap] = await Promise.all([
      statsRepository.pointsByStaff(staffIds, range),
      statsRepository.activityCountByStaff(staffIds, range),
    ]);

    const ranked = staff
      .map((s) => ({
        staffId: s.userId,
        points: pointsMap.get(s._id.toString()) ?? 0,
        activityCount: activityMap.get(s._id.toString()) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.activityCount - a.activityCount ||
          (a.staffId < b.staffId ? -1 : a.staffId > b.staffId ? 1 : 0),
      );

    const entries = ranked.slice(0, limit).map((e, i) => ({ rank: i + 1, ...e }));
    return { period, entries, totalRanked: ranked.length };
  }
}

export const staffStatisticsService = new StaffStatisticsService();

function zeroPoints(): PeriodPoints {
  return { today: 0, week: 0, month: 0, allTime: 0 };
}
function zeroActivity(): StaffStatsResult["activity"] {
  return {
    total: 0,
    byType: {},
    reportsClaimed: 0,
    reportsCompleted: 0,
    reportsAssignedNow: 0,
    ticketsClaimed: 0,
    ticketsCompleted: 0,
    ticketsAssignedNow: 0,
    ticketsByPanel: {},
    giftClaimsHandled: 0,
    giftClaimsApproved: 0,
    giftClaimsRejected: 0,
    giftClaimsFulfilled: 0,
    giftClaimsReRequested: 0,
    userWarningsIssued: 0,
    staffWarningsIssued: 0,
    warningsRevoked: 0,
    appealsSuccessful: 0,
    appealsHandled: 0,
    vacationsApproved: 0,
    vacationsRejected: 0,
  };
}
