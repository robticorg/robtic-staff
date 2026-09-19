import type { Guild, GuildMember } from "discord.js";
import { Types } from "mongoose";
import { config } from "../../../config/index.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import type { GuildId, IdLike } from "../../../shared/types/index.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { periodStart } from "../../../shared/utils/time.ts";
import { staffConfigService } from "../../configuration/services/staff-config.service.ts";
import { StaffTier } from "../../configuration/types/enums.ts";
import { getHierarchy } from "../../configuration/utils/staff-levels.ts";
import { StaffPointTransactionModel } from "../models/staff-point-transaction.model.ts";
import { StaffModel } from "../models/staff.model.ts";
import { StaffStatus } from "../types/enums.ts";

/**
 * `!check` reports on the staff a promotion decision actually applies to — every
 * rung **below** the OWNER boundary. Owner and Ship tiers are left out. With no
 * OWNER boundary configured there is no tier to exclude, so everyone is listed.
 */
export function belowLevelFilter(belowLevel: number | null): Record<string, unknown> {
  return belowLevel === null ? {} : { currentRoleLevel: { $lt: belowLevel } };
}

/** Monday 00:00:00 in the guild timezone → now. */
export interface WeekRange {
  start: Date;
  end: Date;
}

export interface StaffWeeklyPoints {
  staffId: Types.ObjectId;
  userId: string;
  currentRoleLevel: number;
  weeklyPoints: number;
}

export interface CheckEntry {
  displayName: string;
  /** Rendered as a mention on the card. The staff `_id` stays internal. */
  userId: string;
  weeklyPoints: number;
  eligible: boolean;
  decision: string;
}

export interface CheckResult {
  requiredPoints: number | null;
  range: WeekRange;
  entries: CheckEntry[];
}

interface ActiveStaffRow {
  _id: Types.ObjectId;
  userId: string;
  currentRoleLevel: number;
}

export class StaffPromotionPointsService {
  /**
   * Store the weekly points threshold for a guild. Touches nothing else — no staff
   * points, no roles, no history. Only the cached requirement is invalidated.
   */
  async configureRequiredPoints(guildId: GuildId, points: number): Promise<number> {
    const doc = await staffConfigService.setPromotionPointsRequired(guildId, points);
    return doc.promotionPointsRequired as number;
  }

  getRequiredPoints(guildId: GuildId): Promise<number | null> {
    return staffConfigService.getPromotionPointsRequired(guildId);
  }

  /** Monday 00:00:00 (guild timezone) up to `now`. */
  getCurrentWeekRange(now: Date = new Date()): WeekRange {
    const start = periodStart("week", { zone: config.timezone, now });
    if (!start) throw new Error("week period must always produce a start boundary");
    return { start, end: now };
  }

  /** Net sum of this week's point transactions for one staff member. */
  async getWeeklyPoints(staffId: IdLike, now: Date = new Date()): Promise<number> {
    const range = this.getCurrentWeekRange(now);
    const [row] = await StaffPointTransactionModel.aggregate<{ total: number }>([
      {
        $match: {
          staffId: toObjectId(staffId),
          createdAt: { $gte: range.start, $lte: range.end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  }

  /**
   * Weekly totals for every active staff member in the guild, summed inside MongoDB
   * so no transaction document is ever pulled into memory. `belowLevel` trims the
   * roster before the aggregation runs, so excluded staff cost nothing.
   */
  async getAllStaffWeeklyPoints(
    guildId: GuildId,
    now: Date = new Date(),
    belowLevel: number | null = null,
  ): Promise<StaffWeeklyPoints[]> {
    const staff = await StaffModel.find(
      { guildId, status: StaffStatus.ACTIVE, ...belowLevelFilter(belowLevel) },
      { userId: 1, currentRoleLevel: 1 },
    )
      .lean<ActiveStaffRow[]>()
      .exec();

    if (staff.length === 0) return [];

    const range = this.getCurrentWeekRange(now);
    const rows = await StaffPointTransactionModel.aggregate<{
      _id: Types.ObjectId;
      total: number;
    }>([
      {
        $match: {
          staffId: { $in: staff.map((s) => s._id) },
          createdAt: { $gte: range.start, $lte: range.end },
        },
      },
      { $group: { _id: "$staffId", total: { $sum: "$amount" } } },
    ]);

    const totals = new Map(rows.map((r) => [r._id.toString(), r.total]));
    return staff.map((s) => ({
      staffId: s._id,
      userId: s.userId,
      currentRoleLevel: s.currentRoleLevel,
      weeklyPoints: totals.get(s._id.toString()) ?? 0,
    }));
  }

  /**
   * The whole decision: enough points this week, or not. Nothing subjective, no
   * promotion levels, no side effects.
   */
  evaluateEligibility(weeklyPoints: number, requiredPoints: number): boolean {
    return weeklyPoints >= requiredPoints;
  }

  /**
   * The full `!check` report — one entry per active staff member **below the OWNER
   * boundary**, ordered by staff hierarchy level then display name. Carries the
   * Discord id so the card can mention them; the staff `_id` never leaves here.
   */
  async generateCheckResult(guild: Guild, now: Date = new Date()): Promise<CheckResult> {
    const hierarchy = await getHierarchy(guild.id);
    const ownerStartLevel = hierarchy.boundaryLevels[StaffTier.OWNER];

    const [requiredPoints, weekly] = await Promise.all([
      this.getRequiredPoints(guild.id),
      this.getAllStaffWeeklyPoints(guild.id, now, ownerStartLevel),
    ]);

    const members = await fetchMembers(
      guild,
      weekly.map((w) => w.userId),
    );

    const entries = weekly
      .map((row) => {
        const eligible =
          requiredPoints !== null && this.evaluateEligibility(row.weeklyPoints, requiredPoints);
        return {
          currentRoleLevel: row.currentRoleLevel,
          displayName:
            members.get(row.userId)?.displayName ?? staffMessages.promotionPoints.unknownMember,
          userId: row.userId,
          weeklyPoints: row.weeklyPoints,
          eligible,
          decision: eligible
            ? staffMessages.promotionPoints.eligible
            : staffMessages.promotionPoints.notEligible,
        };
      })
      .sort(
        (a, b) =>
          b.currentRoleLevel - a.currentRoleLevel ||
          a.displayName.localeCompare(b.displayName, "ar"),
      )
      .map(({ currentRoleLevel: _level, ...entry }) => entry);

    return { requiredPoints, range: this.getCurrentWeekRange(now), entries };
  }
}

const MEMBER_FETCH_CHUNK = 100;

async function fetchMembers(
  guild: Guild,
  userIds: readonly string[],
): Promise<Map<string, GuildMember>> {
  const found = new Map<string, GuildMember>();
  const missing: string[] = [];

  for (const userId of userIds) {
    const cached = guild.members.cache.get(userId);
    if (cached) found.set(userId, cached);
    else missing.push(userId);
  }

  for (let i = 0; i < missing.length; i += MEMBER_FETCH_CHUNK) {
    const chunk = missing.slice(i, i + MEMBER_FETCH_CHUNK);
    const fetched = await guild.members.fetch({ user: chunk }).catch(() => null);
    if (!fetched) continue;
    for (const member of fetched.values()) found.set(member.id, member);
  }

  return found;
}

export const staffPromotionPointsService = new StaffPromotionPointsService();
