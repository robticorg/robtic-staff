import type { Guild } from "discord.js";
import type { RoleId, UserId } from "../../../shared/types/index.ts";
import { isSnowflake } from "../../../libs/validation/index.ts";
import type { StaffTier } from "../../configuration/types/enums.ts";
import {
  getHierarchy,
  getRoleForLevel,
  getTierForLevel,
  highestLevelFromRoleIds,
} from "../../configuration/utils/staff-levels.ts";
import { StaffHistoryModel } from "../models/staff-history.model.ts";
import { StaffHistoryAction, type StaffStatus } from "../types/enums.ts";
import { staffService } from "./staff.service.ts";
import { getLevelStart } from "../../configuration/utils/level-start.ts";

export interface StaffProfile {
  userId: UserId;
  status: StaffStatus;
  level: number;
  ladderTop: number;
  /** /start-count — add to `level` / `ladderTop` when showing them. */
  levelStart?: number;
  roleId: RoleId | null;
  tier: StaffTier;
  acceptedBy: UserId | null;
  acceptedAt: Date | null;
  lastPromotion: { at: Date; by: UserId | null } | null;
}

function actorOrNull(id: string | null | undefined): UserId | null {
  return id && isSnowflake(id) ? id : null;
}

export class StaffProfileService {
  async get(guild: Guild, userId: UserId): Promise<StaffProfile | null> {
    const staff = await staffService.get(userId, guild.id);
    if (!staff) return null;

    const [hierarchy, member, promotion, firstAccept] = await Promise.all([
      getHierarchy(guild.id),
      guild.members.fetch(userId).catch(() => null),
      StaffHistoryModel.findOne({ staffId: staff._id, action: StaffHistoryAction.PROMOTE })
        .sort({ createdAt: -1 })
        .exec(),
      staff.acceptedAt
        ? Promise.resolve(null)
        : StaffHistoryModel.findOne({ staffId: staff._id, action: StaffHistoryAction.ACCEPT })
            .sort({ createdAt: -1 })
            .exec(),
    ]);

    const levelFromRoles = member
      ? highestLevelFromRoleIds(hierarchy, member.roles.cache.keys())
      : null;
    const level = levelFromRoles ?? staff.currentRoleLevel;
    const ladderTop = hierarchy.levels.reduce((top, rung) => Math.max(top, rung.level), 0);

    return {
      userId,
      status: staff.status,
      level,
      ladderTop,
      levelStart: await getLevelStart(staff.guildId),
      roleId: getRoleForLevel(hierarchy, level),
      tier: getTierForLevel(hierarchy, level),
      acceptedBy: actorOrNull(staff.acceptedBy ?? firstAccept?.performedBy),
      acceptedAt: staff.acceptedAt ?? firstAccept?.createdAt ?? null,
      lastPromotion: promotion
        ? { at: promotion.createdAt, by: actorOrNull(promotion.performedBy) }
        : null,
    };
  }
}

export const staffProfileService = new StaffProfileService();
