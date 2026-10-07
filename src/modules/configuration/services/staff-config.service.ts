import type { HydratedDocument } from "mongoose";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache } from "../../../libs/cache/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { StaffConfigModel, type StaffConfig } from "../models/staff-config.model.ts";

const promotionPointsCache = new TtlCache<number | null>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });
const pointValuesCache = new TtlCache<Record<string, number>>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });
const levelStartCache = new TtlCache<number>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

export const LEVEL_START_VALUES = [0, 1] as const;

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

  async setAutoclaimEnabled(guildId: GuildId, enabled: boolean): Promise<boolean> {
    if (!guildId) throw new ValidationError("guildId is required");
    const doc = await this.model
      .findOneAndUpdate(
        { guildId },
        { $set: { autoclaimEnabled: enabled } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    return doc?.autoclaimEnabled === true;
  }

  async isAutoclaimEnabled(guildId: GuildId): Promise<boolean> {
    const doc = await this.model.findOne({ guildId }).select({ autoclaimEnabled: 1 }).exec();
    return doc?.autoclaimEnabled === true;
  }

  /** Only the overridden types — callers fall back to DEFAULT_POINT_VALUES for the rest. */
  async getPointValueOverrides(guildId: GuildId): Promise<Record<string, number>> {
    const load = async () => {
      const doc = await this.model.findOne({ guildId }).select({ pointValues: 1 }).lean().exec();
      return { ...(doc?.pointValues ?? {}) };
    };
    if (!CACHE_ENABLED) return load();
    return pointValuesCache.getOrSet(guildId, load);
  }

  async setPointValues(guildId: GuildId, values: Record<string, number>): Promise<void> {
    if (!guildId) throw new ValidationError("guildId is required");
    const $set: Record<string, number> = {};
    for (const [type, amount] of Object.entries(values)) {
      if (!Number.isInteger(amount)) throw new ValidationError("POINT_VALUE_INVALID", { type, amount });
      $set[`pointValues.${type}`] = amount;
    }
    if (Object.keys($set).length === 0) return;
    await this.model
      .updateOne({ guildId }, { $set }, { upsert: true, setDefaultsOnInsert: true })
      .exec();
    pointValuesCache.delete(guildId);
  }

  async getLevelStart(guildId: GuildId): Promise<number> {
    const load = async () => {
      const doc = await this.model.findOne({ guildId }).select({ levelStart: 1 }).lean().exec();
      return doc?.levelStart === 1 ? 1 : 0;
    };
    if (!CACHE_ENABLED) return load();
    return levelStartCache.getOrSet(guildId, load);
  }

  async setLevelStart(guildId: GuildId, start: number): Promise<void> {
    if (!guildId) throw new ValidationError("guildId is required");
    if (!(LEVEL_START_VALUES as readonly number[]).includes(start)) {
      throw new ValidationError("LEVEL_START_INVALID", { start });
    }
    await this.model
      .updateOne({ guildId }, { $set: { levelStart: start } }, { upsert: true, setDefaultsOnInsert: true })
      .exec();
    levelStartCache.delete(guildId);
  }

  invalidate(guildId: GuildId): void {
    promotionPointsCache.delete(guildId);
    pointValuesCache.delete(guildId);
    levelStartCache.delete(guildId);
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
