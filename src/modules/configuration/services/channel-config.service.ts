import type { HydratedDocument } from "mongoose";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache, cacheKey } from "../../../libs/cache/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { ChannelId, GuildId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { ChannelConfigModel, type ChannelConfig } from "../models/channel-config.model.ts";
import { CHANNEL_CONFIG_TYPE_VALUES, type ChannelConfigType } from "../types/enums.ts";

export interface SetChannelInput {
  guildId: GuildId;
  type: ChannelConfigType;
  channelId: ChannelId;
}

const channelIdCache = new TtlCache<ChannelId | null>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

export class ChannelConfigService extends BaseRepository<ChannelConfig> {
  constructor() {
    super(ChannelConfigModel);
  }

  async set(input: SetChannelInput): Promise<HydratedDocument<ChannelConfig>> {
    if (!CHANNEL_CONFIG_TYPE_VALUES.includes(input.type)) {
      throw new ValidationError("Unknown channel config type", { type: input.type });
    }
    if (!input.guildId || !input.channelId) {
      throw new ValidationError("guildId and channelId are required");
    }
    const doc = await this.model
      .findOneAndUpdate(
        { guildId: input.guildId, type: input.type },
        { $set: { channelId: input.channelId } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    channelIdCache.delete(cacheKey(input.guildId, input.type));
    return doc as HydratedDocument<ChannelConfig>;
  }

  get(
    guildId: GuildId,
    type: ChannelConfigType,
  ): Promise<HydratedDocument<ChannelConfig> | null> {
    return this.findOne({ guildId, type });
  }

  async getChannelId(guildId: GuildId, type: ChannelConfigType): Promise<ChannelId | null> {
    if (!CACHE_ENABLED) return this.loadChannelId(guildId, type);
    return channelIdCache.getOrSet(cacheKey(guildId, type), () =>
      this.loadChannelId(guildId, type),
    );
  }

  private async loadChannelId(
    guildId: GuildId,
    type: ChannelConfigType,
  ): Promise<ChannelId | null> {
    const doc = await this.get(guildId, type);
    return doc?.channelId ?? null;
  }

  listByGuild(guildId: GuildId): Promise<HydratedDocument<ChannelConfig>[]> {
    return this.find({ guildId }, { sort: 1 });
  }

  async asMap(guildId: GuildId): Promise<Partial<Record<ChannelConfigType, ChannelId>>> {
    const rows = await this.model.find({ guildId }).exec();
    const map: Partial<Record<ChannelConfigType, ChannelId>> = {};
    for (const row of rows) map[row.type] = row.channelId;
    return map;
  }

  async unset(
    guildId: GuildId,
    type: ChannelConfigType,
  ): Promise<HydratedDocument<ChannelConfig> | null> {
    const doc = await this.model.findOneAndDelete({ guildId, type }).exec();
    channelIdCache.delete(cacheKey(guildId, type));
    return doc;
  }
}

export const channelConfigService = new ChannelConfigService();
