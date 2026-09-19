import type { HydratedDocument } from "mongoose";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache } from "../../../libs/cache/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { StaffConfigModel, type StaffConfig } from "../models/staff-config.model.ts";

const promotionPointsCache = new TtlCache<number | null>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

export class StaffConfigService extends BaseRepository<StaffConfig> {
  constructor() {
    super(StaffConfigModel);
  }

  get(guildId: GuildId): Promise<HydratedDocument<StaffConfig> | null> {
    return this.findOne({ guildId });
  }

  async setPromotionPointsRequired(
    guildId: GuildId,
    points: number,
  ): Promise<HydratedDocument<StaffConfig>> {
    if (!guildId) throw new ValidationError("guildId is required");
    assertPositiveInteger(points);

    const doc = await this.model
      .findOneAndUpdate(
        { guildId },
        { $set: { promotionPointsRequired: points } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    promotionPointsCache.delete(guildId);
    return doc as HydratedDocument<StaffConfig>;
  }

  async getPromotionPointsRequired(guildId: GuildId): Promise<number | null> {
    if (!CACHE_ENABLED) return this.loadPromotionPointsRequired(guildId);
    return promotionPointsCache.getOrSet(guildId, () =>
      this.loadPromotionPointsRequired(guildId),
    );
  }

  private async loadPromotionPointsRequired(guildId: GuildId): Promise<number | null> {
    const doc = await this.model
      .findOne({ guildId })
      .select({ promotionPointsRequired: 1 })
      .exec();
    return doc?.promotionPointsRequired ?? null;
  }

  invalidate(guildId: GuildId): void {
    promotionPointsCache.delete(guildId);
  }
}

export function assertPositiveInteger(points: number): void {
  if (typeof points !== "number" || !Number.isFinite(points)) {
    throw new ValidationError("PROMOTION_POINTS_INVALID", { points });
  }
  if (!Number.isInteger(points)) {
    throw new ValidationError("PROMOTION_POINTS_INVALID", { points });
  }
  if (points < 1) {
    throw new ValidationError("PROMOTION_POINTS_INVALID", { points });
  }
}

export const staffConfigService = new StaffConfigService();
