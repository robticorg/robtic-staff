import { TtlCache } from "../../../libs/cache/index.ts";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { WhitelistModel, type WhitelistEntryDocument } from "../models/whitelist.model.ts";
import { isBotOwner } from "./admin-access.ts";

const CACHE_TTL_MS = 60_000;

export class WhitelistService {
  private readonly cache = new TtlCache<boolean>({ defaultTtlMs: CACHE_TTL_MS });

  private key(guildId: GuildId, userId: UserId): string {
    return `${guildId}:${userId}`;
  }

  async isWhitelisted(guildId: GuildId, userId: UserId): Promise<boolean> {
    return this.cache.getOrSet(this.key(guildId, userId), async () =>
      !!(await WhitelistModel.exists({ guildId, userId }).exec()),
    );
  }

  async canUseRestricted(guildId: GuildId, userId: UserId): Promise<boolean> {
    return isBotOwner(userId) || this.isWhitelisted(guildId, userId);
  }

  async add(guildId: GuildId, userId: UserId, addedBy: UserId): Promise<boolean> {
    try {
      await WhitelistModel.create({ guildId, userId, addedBy });
      return true;
    } catch (err) {
      if (isDuplicateKeyError(err)) return false;
      throw err;
    } finally {
      this.cache.delete(this.key(guildId, userId));
    }
  }

  async remove(guildId: GuildId, userId: UserId): Promise<boolean> {
    const result = await WhitelistModel.deleteOne({ guildId, userId }).exec();
    this.cache.delete(this.key(guildId, userId));
    return result.deletedCount > 0;
  }

  list(guildId: GuildId): Promise<WhitelistEntryDocument[]> {
    return WhitelistModel.find({ guildId }).sort({ createdAt: 1 }).exec();
  }
}

export const whitelistService = new WhitelistService();
