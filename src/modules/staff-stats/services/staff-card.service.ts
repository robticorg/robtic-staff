import type { Guild } from "discord.js";
import { DateTime } from "luxon";
import type { Types } from "mongoose";
import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { config } from "../../../config/index.ts";
import { StaffApplicationModel } from "../../applications/shared/staff-application.model.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";
import { getHierarchy, getRoleForLevel } from "../../configuration/utils/staff-levels.ts";
import { PunishmentModel } from "../../punishment/models/punishment.model.ts";
import { PunishmentType } from "../../punishment/types/enums.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffHistoryModel } from "../../staff/models/staff-history.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import type { StaffDocument } from "../../staff/models/staff.model.ts";
import { staffProfileService } from "../../staff/services/staff-profile.service.ts";
import { staffService } from "../../staff/services/staff.service.ts";
import {
  StaffActivityType,
  StaffHistoryAction,
  StaffStatus,
  type StaffType,
} from "../../staff/types/enums.ts";
import { StatsPeriod } from "../types/enums.ts";
import { resolveStatsRange } from "../utils/date-range.ts";
import { staffStatisticsService, type RecentActivityItem } from "./staff-statistics.service.ts";
import { statsRepository, type TicketStatRow } from "./stats-repository.ts";

export const WEEKS_PER_PAGE = 3;
const AVATAR_SIZE = 256;

export interface StaffCardOverview {
  userId: UserId;
  avatarUrl: string | null;
  status: StaffStatus;
  level: number;
  roleId: RoleId | null;
  tier: StaffTier;
  staffType: StaffType | null;
  acceptedBy: UserId | null;
  acceptedAt: Date | null;
  /** Set once they've been fired or blacklisted — the role they held right before. */
  fired: { by: UserId | null; at: Date | null; level: number; roleId: RoleId | null } | null;
  totalPoints: number;
}

export interface WeekPoints {
  index: number;
  start: Date;
  end: Date;
  total: number;
  breakdown: Record<string, number>;
}

export interface WeeklyPointsPage {
  totalPoints: number;
  weeks: WeekPoints[];
  page: number;
  pages: number;
}

export interface StaffActionStats {
  reportsClaimed: number;
  reportsCompleted: number;
  staffAccepted: number;
  applicationsRefused: number;
  staffFired: number;
  staffPromoted: number;
  staffDemoted: number;
  /** null when they never verified anyone and don't manage girls — the line is hidden. */
  girlsVerified: number | null;
  jails: number;
  userWarningsIssued: number;
  staffWarningsIssued: number;
  warningsRevoked: number;
  appealsHandled: number;
  giftClaimsHandled: number;
  vacationsDecided: number;
}

function snowflakeOrNull(id: string | null | undefined): UserId | null {
  return id && /^\d{17,20}$/.test(id) ? id : null;
}

/** Splits [from, now] into timezone-aware weeks, oldest first, bucketing each transaction. */
export function bucketWeeks(
  transactions: readonly { amount: number; type: string; createdAt: Date }[],
  from: Date,
  now: Date = new Date(),
  zone: string = config.timezone,
): WeekPoints[] {
  const first = DateTime.fromJSDate(from, { zone }).startOf("week");
  const last = DateTime.fromJSDate(now, { zone }).startOf("week");
  const weeks: WeekPoints[] = [];
  for (let cursor = first, i = 1; cursor <= last; cursor = cursor.plus({ weeks: 1 }), i += 1) {
    weeks.push({
      index: i,
      start: cursor.toJSDate(),
      end: cursor.endOf("week").toJSDate(),
      total: 0,
      breakdown: {},
    });
  }

  for (const tx of transactions) {
    const weekStart = DateTime.fromJSDate(tx.createdAt, { zone }).startOf("week");
    const offset = Math.round(weekStart.diff(first, "weeks").weeks);
    const week = weeks[offset];
    if (!week) continue;
    week.total += tx.amount;
    week.breakdown[tx.type] = (week.breakdown[tx.type] ?? 0) + tx.amount;
  }
  return weeks;
}

export function paginateWeeks(
  weeks: readonly WeekPoints[],
  page: number,
): { weeks: WeekPoints[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(weeks.length / WEEKS_PER_PAGE));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  const start = (current - 1) * WEEKS_PER_PAGE;
  return { weeks: weeks.slice(start, start + WEEKS_PER_PAGE), page: current, pages };
}

export class StaffCardService {
  getStaff(guildId: GuildId, userId: UserId): Promise<StaffDocument | null> {
    return staffService.get(userId, guildId);
  }

  async overview(guild: Guild, staff: StaffDocument): Promise<StaffCardOverview> {
    const userId = staff.userId;
    const staffObjId = staff._id as Types.ObjectId;
    const isOut =
      staff.status === StaffStatus.FIRED || staff.status === StaffStatus.BLACKLISTED;

    const [profile, hierarchy, member, lastFire, totalPoints] = await Promise.all([
      staffProfileService.get(guild, userId),
      getHierarchy(guild.id),
      guild.members.fetch(userId).catch(() => null),
      isOut
        ? StaffHistoryModel.findOne({
            staffId: staffObjId,
            action: { $in: [StaffHistoryAction.FIRE, StaffHistoryAction.BLACKLIST] },
          })
            .sort({ createdAt: -1 })
            .exec()
        : Promise.resolve(null),
      statsRepository.pointsForStaff(staffObjId, resolveStatsRange(StatsPeriod.ALL_TIME)),
    ]);

    const user = member?.user ?? (await guild.client.users.fetch(userId).catch(() => null));
    const avatarUrl =
      member?.displayAvatarURL({ size: AVATAR_SIZE }) ??
      user?.displayAvatarURL({ size: AVATAR_SIZE }) ??
      null;

    const level = profile?.level ?? staff.currentRoleLevel;
    const firedLevel = lastFire?.previousRoleLevel ?? staff.currentRoleLevel;

    return {
      userId,
      avatarUrl,
      status: staff.status,
      level,
      roleId: profile?.roleId ?? getRoleForLevel(hierarchy, level),
      tier: profile?.tier ?? StaffTier.STAFF,
      staffType: staff.staffType ?? null,
      acceptedBy: profile?.acceptedBy ?? snowflakeOrNull(staff.acceptedBy),
      acceptedAt: profile?.acceptedAt ?? staff.acceptedAt ?? null,
      fired: isOut
        ? {
            by: snowflakeOrNull(staff.firedBy ?? lastFire?.performedBy),
            at: staff.firedAt ?? lastFire?.createdAt ?? null,
            level: firedLevel,
            roleId: getRoleForLevel(hierarchy, firedLevel),
          }
        : null,
      totalPoints,
    };
  }

  async weeklyPoints(staff: StaffDocument, page: number, now = new Date()): Promise<WeeklyPointsPage> {
    const staffObjId = staff._id as Types.ObjectId;
    const transactions = await StaffPointTransactionModel.find(
      { staffId: staffObjId },
      { amount: 1, type: 1, createdAt: 1 },
    )
      .sort({ createdAt: 1 })
      .lean<{ amount: number; type: string; createdAt: Date }[]>()
      .exec();

    const candidates = [staff.acceptedAt, transactions[0]?.createdAt].filter(
      (d): d is Date => d instanceof Date,
    );
    const from = candidates.length
      ? new Date(Math.min(...candidates.map((d) => d.getTime())))
      : now;

    const weeks = bucketWeeks(transactions, from, now);
    const totalPoints = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    return { totalPoints, ...paginateWeeks(weeks, page) };
  }

  async actions(guild: Guild, staff: StaffDocument): Promise<StaffActionStats> {
    const guildId = guild.id;
    const userId = staff.userId;
    const guildStaffIds = (await statsRepository.guildStaff(guildId)).map((s) => s._id);

    const [stats, history, refused, verifiedByApps, verifiedByActivity, jails, girlsManager, member] =
      await Promise.all([
        staffStatisticsService.getStaffStats({
          guildId,
          staffId: userId,
          period: StatsPeriod.ALL_TIME,
        }),
        StaffHistoryModel.aggregate<{ _id: string; count: number }>([
          { $match: { performedBy: userId, staffId: { $in: guildStaffIds } } },
          { $group: { _id: "$action", count: { $sum: 1 } } },
        ]),
        StaffApplicationModel.countDocuments({ guildId, rejectedBy: userId }),
        StaffApplicationModel.distinct("userId", { guildId, girlVerifiedBy: userId }),
        StaffActivityModel.distinct("referenceId", {
          staffId: staff._id,
          type: StaffActivityType.GIRL_VERIFY,
        }),
        PunishmentModel.countDocuments({ guildId, issuedBy: userId, type: PunishmentType.JAIL }),
        roleConfigService.getByType(guildId, RoleConfigType.GIRLS_MANAGER),
        guild.members.fetch(userId).catch(() => null),
      ]);

    const byAction = Object.fromEntries(history.map((r) => [r._id, r.count]));
    const girls = new Set<string>([
      ...(verifiedByApps as string[]),
      ...(verifiedByActivity as (string | null)[]).filter((id): id is string => !!id),
    ]).size;
    const managesGirls = !!girlsManager && !!member?.roles.cache.has(girlsManager.roleId);
    const a = stats.activity;

    return {
      reportsClaimed: a.reportsClaimed,
      reportsCompleted: a.reportsCompleted,
      staffAccepted: byAction[StaffHistoryAction.ACCEPT] ?? 0,
      applicationsRefused: refused,
      staffFired:
        (byAction[StaffHistoryAction.FIRE] ?? 0) + (byAction[StaffHistoryAction.BLACKLIST] ?? 0),
      staffPromoted: byAction[StaffHistoryAction.PROMOTE] ?? 0,
      staffDemoted: byAction[StaffHistoryAction.DEMOTE] ?? 0,
      girlsVerified: girls > 0 || managesGirls ? girls : null,
      jails,
      userWarningsIssued: a.userWarningsIssued,
      staffWarningsIssued: a.staffWarningsIssued,
      warningsRevoked: a.warningsRevoked,
      appealsHandled: a.appealsHandled,
      giftClaimsHandled: a.giftClaimsHandled,
      vacationsDecided: a.vacationsApproved + a.vacationsRejected,
    };
  }

  tickets(guildId: GuildId, staff: StaffDocument): Promise<TicketStatRow> {
    return statsRepository.ticketStats(
      guildId,
      staff._id as Types.ObjectId,
      resolveStatsRange(StatsPeriod.ALL_TIME),
    );
  }

  async recent(staff: StaffDocument, limit = 10): Promise<RecentActivityItem[]> {
    const rows = await statsRepository.recentActivity(staff._id as Types.ObjectId, limit);
    return rows.map((r) => ({ type: r.type, referenceId: r.referenceId, at: r.createdAt }));
  }
}

export const staffCardService = new StaffCardService();
