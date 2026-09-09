import { Types } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { AppealModel } from "../../appeals/models/appeal.model.ts";
import { AppealStatus } from "../../appeals/types/enums.ts";
import { GiftClaimAuditModel } from "../../gift-claims/models/gift-claim-audit.model.ts";
import { GiftClaimAuditAction } from "../../gift-claims/types/enums.ts";
import { ModmailCaseModel } from "../../modmail/models/modmail-case.model.ts";
import { ModmailCaseStatus } from "../../modmail/types/enums.ts";
import { StaffActivityModel } from "../../staff/models/staff-activity.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import { StaffModel, type Staff } from "../../staff/models/staff.model.ts";
import { StaffActivityType, StaffStatus } from "../../staff/types/enums.ts";
import { TicketModel } from "../../tickets/models/ticket.model.ts";
import { TicketStatus } from "../../tickets/types/enums.ts";
import { StaffWarningModel } from "../../warnings/models/staff-warning.model.ts";
import { UserWarningModel } from "../../warnings/models/user-warning.model.ts";
import { WarningStatus } from "../../warnings/types/enums.ts";
import type { StatsRange } from "../utils/date-range.ts";
import { rangeFilter } from "../utils/date-range.ts";

export interface GuildStaffRow {
  _id: Types.ObjectId;
  userId: UserId;
  status: Staff["status"];
  currentRoleLevel: number;
}

export interface ReportStatRow {
  claimed: number;
  completed: number;
  assignedNow: number;
}

export interface TicketStatRow {
  claimed: number;
  completed: number;
  assignedNow: number;
  byPanel: Record<string, number>;
}

export interface GiftClaimStatRow {
  approved: number;
  rejected: number;
  fulfilled: number;
  reRequested: number;
  handled: number;
}

export interface WarningStatRow {
  userWarningsIssued: number;
  staffWarningsIssued: number;
  warningsRevoked: number;
  appealsSuccessful: number;
  appealsHandled: number;
}

export class StatsRepository {
  guildStaff(guildId: GuildId, opts: { excludeInactive?: boolean } = {}): Promise<GuildStaffRow[]> {
    const filter: Record<string, unknown> = { guildId };
    if (opts.excludeInactive) {
      filter.status = { $nin: [StaffStatus.FIRED, StaffStatus.BLACKLISTED] };
    }
    return StaffModel.find(filter, { userId: 1, status: 1, currentRoleLevel: 1 })
      .lean<GuildStaffRow[]>()
      .exec();
  }

  async pointsByStaff(
    staffIds: readonly Types.ObjectId[],
    range: StatsRange,
  ): Promise<Map<string, number>> {
    if (staffIds.length === 0) return new Map();
    const rows = await StaffPointTransactionModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { staffId: { $in: staffIds as Types.ObjectId[] }, ...rangeFilter(range) } },
      { $group: { _id: "$staffId", total: { $sum: "$amount" } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), r.total]));
  }

  async pointsForStaff(staffId: Types.ObjectId, range: StatsRange): Promise<number> {
    const [row] = await StaffPointTransactionModel.aggregate<{ total: number }>([
      { $match: { staffId, ...rangeFilter(range) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  }

  async pointBreakdown(
    staffId: Types.ObjectId,
    range: StatsRange,
  ): Promise<Record<string, number>> {
    const rows = await StaffPointTransactionModel.aggregate<{ _id: string; total: number }>([
      { $match: { staffId, ...rangeFilter(range) } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r.total]));
  }

  pointTransactions(staffId: Types.ObjectId, range: StatsRange, limit: number) {
    return StaffPointTransactionModel.find({ staffId, ...rangeFilter(range) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async activityCountByStaff(
    staffIds: readonly Types.ObjectId[],
    range: StatsRange,
  ): Promise<Map<string, number>> {
    if (staffIds.length === 0) return new Map();
    const rows = await StaffActivityModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { staffId: { $in: staffIds as Types.ObjectId[] }, ...rangeFilter(range) } },
      { $group: { _id: "$staffId", count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), r.count]));
  }

  async activityByType(
    staffId: Types.ObjectId,
    range: StatsRange,
  ): Promise<Record<string, number>> {
    const rows = await StaffActivityModel.aggregate<{ _id: StaffActivityType; count: number }>([
      { $match: { staffId, ...rangeFilter(range) } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  }

  recentActivity(staffId: Types.ObjectId, limit: number) {
    return StaffActivityModel.find({ staffId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async reportStats(
    guildId: GuildId,
    staffId: Types.ObjectId,
    range: StatsRange,
  ): Promise<ReportStatRow> {
    const [claimed, completed, assignedNow] = await Promise.all([
      StaffActivityModel.countDocuments({
        staffId,
        type: StaffActivityType.REPORT_CLAIM,
        ...rangeFilter(range),
      }),
      StaffActivityModel.countDocuments({
        staffId,
        type: StaffActivityType.REPORT_COMPLETE,
        ...rangeFilter(range),
      }),
      ModmailCaseModel.countDocuments({
        guildId,
        claimedBy: staffId,
        status: {
          $in: [
            ModmailCaseStatus.CLAIMED,
            ModmailCaseStatus.INVESTIGATING,
            ModmailCaseStatus.WAITING_USER,
          ],
        },
      }),
    ]);
    return { claimed, completed, assignedNow };
  }

  async ticketStats(
    guildId: GuildId,
    staffId: Types.ObjectId,
    range: StatsRange,
  ): Promise<TicketStatRow> {
    const [claimed, completed, assignedNow, panelRows] = await Promise.all([
      TicketModel.countDocuments({ guildId, claimedBy: staffId, ...rangeFilter(range, "claimedAt") }),
      TicketModel.countDocuments({
        guildId,
        claimedBy: staffId,
        status: { $in: [TicketStatus.CLOSED, TicketStatus.DELETED] },
        ...rangeFilter(range, "closedAt"),
      }),
      TicketModel.countDocuments({
        guildId,
        claimedBy: staffId,
        status: TicketStatus.CLAIMED,
      }),
      TicketModel.aggregate<{ _id: string; count: number }>([
        { $match: { guildId, claimedBy: staffId, ...rangeFilter(range, "claimedAt") } },
        { $group: { _id: "$panelId", count: { $sum: 1 } } },
      ]),
    ]);
    return {
      claimed,
      completed,
      assignedNow,
      byPanel: Object.fromEntries(panelRows.map((r) => [r._id, r.count])),
    };
  }

  async giftClaimStats(
    guildId: GuildId,
    actorId: UserId,
    range: StatsRange,
  ): Promise<GiftClaimStatRow> {
    const rows = await GiftClaimAuditModel.aggregate<{ _id: string; count: number }>([
      { $match: { guildId, actorId, ...rangeFilter(range) } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
    ]);
    const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const approved = by[GiftClaimAuditAction.APPROVED] ?? 0;
    const rejected = by[GiftClaimAuditAction.REJECTED] ?? 0;
    const fulfilled = by[GiftClaimAuditAction.FULFILLED] ?? 0;
    const reRequested = by[GiftClaimAuditAction.RE_REQUESTED] ?? 0;
    return { approved, rejected, fulfilled, reRequested, handled: fulfilled + rejected };
  }

  async warningStats(
    guildId: GuildId,
    staffId: Types.ObjectId,
    actorId: UserId,
    guildStaffIds: readonly Types.ObjectId[],
    range: StatsRange,
  ): Promise<WarningStatRow> {
    const [
      userWarningsIssued,
      staffWarningsIssued,
      userWarnRevoked,
      staffWarnRemoved,
      appealsSuccessful,
      appealsHandled,
    ] = await Promise.all([
      UserWarningModel.countDocuments({ guildId, issuedBy: actorId, ...rangeFilter(range) }),
      StaffWarningModel.countDocuments({
        staffId: { $in: guildStaffIds as Types.ObjectId[] },
        issuedBy: actorId,
        ...rangeFilter(range),
      }),
      UserWarningModel.countDocuments({
        guildId,
        revokedBy: actorId,
        status: WarningStatus.REVOKED,
        ...rangeFilter(range, "revokedAt"),
      }),
      StaffWarningModel.countDocuments({
        staffId: { $in: guildStaffIds as Types.ObjectId[] },
        removedBy: actorId,
        status: WarningStatus.REMOVED,
        ...rangeFilter(range, "removedAt"),
      }),
      AppealModel.countDocuments({
        guildId,
        reviewedBy: actorId,
        status: AppealStatus.ACCEPTED,
        ...rangeFilter(range, "reviewedAt"),
      }),
      AppealModel.countDocuments({
        guildId,
        reviewedBy: actorId,
        status: { $in: [AppealStatus.ACCEPTED, AppealStatus.REJECTED] },
        ...rangeFilter(range, "reviewedAt"),
      }),
    ]);
    void staffId;
    return {
      userWarningsIssued,
      staffWarningsIssued,
      warningsRevoked: userWarnRevoked + staffWarnRemoved,
      appealsSuccessful,
      appealsHandled,
    };
  }
}

export const statsRepository = new StatsRepository();
