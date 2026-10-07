import type { GuildId, IdLike } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { staffConfigService } from "../../configuration/services/staff-config.service.ts";
import { DEFAULT_POINT_VALUES } from "../config/points.ts";
import { StaffModel } from "../models/staff.model.ts";
import type { StaffPointTransactionType } from "../types/enums.ts";

const log = logger.child("staff:point-values");

/**
 * What a bot-awarded action is worth in this guild: the /points values override
 * if one is set, otherwise DEFAULT_POINT_VALUES. A config read failure falls back
 * to the default — an action must never fail because of it.
 */
export class PointValuesService {
  async valueOf(guildId: GuildId, type: StaffPointTransactionType): Promise<number> {
    try {
      const overrides = await staffConfigService.getPointValueOverrides(guildId);
      const value = overrides[type];
      return typeof value === "number" && Number.isInteger(value) ? value : DEFAULT_POINT_VALUES[type];
    } catch (err) {
      log.warn(`point value for ${type} in ${guildId} unavailable, using default`, err);
      return DEFAULT_POINT_VALUES[type];
    }
  }

  async all(guildId: GuildId): Promise<Record<StaffPointTransactionType, number>> {
    const overrides = await staffConfigService.getPointValueOverrides(guildId).catch(() => ({}));
    const out = { ...DEFAULT_POINT_VALUES };
    for (const [type, value] of Object.entries(overrides)) {
      if (type in out && Number.isInteger(value)) out[type as StaffPointTransactionType] = value as number;
    }
    return out;
  }

  /** For callers that only hold a staff id. */
  async forStaff(staffId: IdLike, type: StaffPointTransactionType): Promise<number> {
    const staff = await StaffModel.findById(toObjectId(staffId), { guildId: 1 }).lean().exec().catch(() => null);
    return staff?.guildId ? this.valueOf(staff.guildId, type) : DEFAULT_POINT_VALUES[type];
  }
}

export const pointValuesService = new PointValuesService();
