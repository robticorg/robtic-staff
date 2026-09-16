import type { HydratedDocument } from "mongoose";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache } from "../../../libs/cache/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { RoleConfigModel, type RoleConfig } from "../models/role-config.model.ts";
import {
  ROLE_CONFIG_TYPE_VALUES,
  RoleConfigType,
  SINGLETON_ROLE_TYPES,
  STAFF_TIER_BOUNDARIES,
  type StaffTier,
} from "../types/enums.ts";

export interface StaffRoleLevel {
  roleId: RoleId;
  level: number;
  type: RoleConfigType;
}

export interface SetRoleInput {
  guildId: GuildId;
  roleId: RoleId;
  type: RoleConfigType;

  level?: number;
}

const staffLevelsCache = new TtlCache<StaffRoleLevel[]>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });
const generalStaffRoleCache = new TtlCache<RoleId | null>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

const invalidationListeners = new Set<(guildId: GuildId) => void>();

export function onRoleConfigInvalidated(listener: (guildId: GuildId) => void): void {
  invalidationListeners.add(listener);
}

function invalidateRoleConfig(guildId: GuildId): void {
  staffLevelsCache.delete(guildId);
  generalStaffRoleCache.delete(guildId);
  for (const listener of invalidationListeners) listener(guildId);
}

export class RoleConfigService extends BaseRepository<RoleConfig> {
  constructor() {
    super(RoleConfigModel);
  }

  get(guildId: GuildId, roleId: RoleId): Promise<HydratedDocument<RoleConfig> | null> {
    return this.findOne({ guildId, roleId });
  }

  listByGuild(guildId: GuildId): Promise<HydratedDocument<RoleConfig>[]> {
    return this.model.find({ guildId }).sort({ level: 1, type: 1 }).exec();
  }

  listByType(
    guildId: GuildId,
    type: RoleConfigType,
  ): Promise<HydratedDocument<RoleConfig>[]> {
    return this.model.find({ guildId, type }).sort({ level: 1 }).exec();
  }

  getByType(
    guildId: GuildId,
    type: RoleConfigType,
  ): Promise<HydratedDocument<RoleConfig> | null> {
    return this.findOne({ guildId, type });
  }

  async setRole(input: SetRoleInput): Promise<HydratedDocument<RoleConfig>> {
    if (!ROLE_CONFIG_TYPE_VALUES.includes(input.type)) {
      throw new ValidationError("Unknown role config type", { type: input.type });
    }
    if (!input.guildId || !input.roleId) {
      throw new ValidationError("guildId and roleId are required");
    }

    let level = input.level;
    if (input.type === RoleConfigType.START) level = 0;
    if (input.type === RoleConfigType.IGNORE) {
      if (level !== undefined) {
        throw new ValidationError("IGNORE roles must not have a level");
      }
    }
    if (level !== undefined && (!Number.isInteger(level) || level < 0)) {
      throw new ValidationError("Role level must be a non-negative integer", { level });
    }

    if (SINGLETON_ROLE_TYPES.includes(input.type)) {
      const filter: Record<string, unknown> = {
        guildId: input.guildId,
        type: input.type,
        roleId: { $ne: input.roleId },
      };

      if (input.type === RoleConfigType.STAFF && level === undefined) {
        filter.level = { $exists: false };
      }
      await this.model.deleteMany(filter).exec();
    }

    const update =
      level === undefined
        ? { $set: { type: input.type }, $unset: { level: "" } }
        : { $set: { type: input.type, level } };

    const doc = await this.model
      .findOneAndUpdate({ guildId: input.guildId, roleId: input.roleId }, update, {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      })
      .exec();
    invalidateRoleConfig(input.guildId);
    return doc as HydratedDocument<RoleConfig>;
  }

  async touchGuild(guildId: GuildId): Promise<void> {
    invalidateRoleConfig(guildId);
  }

  async unsetRole(
    guildId: GuildId,
    roleId: RoleId,
  ): Promise<HydratedDocument<RoleConfig> | null> {
    const doc = await this.model.findOneAndDelete({ guildId, roleId }).exec();
    invalidateRoleConfig(guildId);
    return doc;
  }

  async unsetType(guildId: GuildId, type: RoleConfigType): Promise<number> {
    const result = await this.model.deleteMany({ guildId, type }).exec();
    invalidateRoleConfig(guildId);
    return result.deletedCount ?? 0;
  }

  async getStaffRoleLevels(guildId: GuildId): Promise<StaffRoleLevel[]> {
    if (!CACHE_ENABLED) return this.loadStaffRoleLevels(guildId);
    const cached = await staffLevelsCache.getOrSet(guildId, () =>
      this.loadStaffRoleLevels(guildId),
    );
    return cached.map((r) => ({ ...r }));
  }

  private async loadStaffRoleLevels(guildId: GuildId): Promise<StaffRoleLevel[]> {
    const rows = await this.model
      .find({ guildId, level: { $gte: 0 } })
      .sort({ level: 1 })
      .select({ roleId: 1, level: 1, type: 1 })
      .exec();
    return rows.map((r) => ({ roleId: r.roleId, level: r.level as number, type: r.type }));
  }

  async getStaffLevel(guildId: GuildId, roleId: RoleId): Promise<number | null> {
    const row = await this.findOne({ guildId, roleId, level: { $gte: 0 } });
    return row?.level ?? null;
  }

  async getHighestStaffLevel(
    guildId: GuildId,
    roleIds: readonly RoleId[],
  ): Promise<number | null> {
    if (roleIds.length === 0) return null;
    const row = await this.model
      .findOne({ guildId, roleId: { $in: roleIds as RoleId[] }, level: { $gte: 0 } })
      .sort({ level: -1 })
      .select({ level: 1 })
      .exec();
    return row?.level ?? null;
  }

  getGeneralStaffRole(guildId: GuildId): Promise<HydratedDocument<RoleConfig> | null> {
    return this.findOne({ guildId, type: RoleConfigType.STAFF, level: { $exists: false } });
  }

  async getGeneralStaffRoleId(guildId: GuildId): Promise<RoleId | null> {
    if (!CACHE_ENABLED) return this.loadGeneralStaffRoleId(guildId);
    return generalStaffRoleCache.getOrSet(guildId, () => this.loadGeneralStaffRoleId(guildId));
  }

  private async loadGeneralStaffRoleId(guildId: GuildId): Promise<RoleId | null> {
    const row = await this.model
      .findOne({ guildId, type: RoleConfigType.STAFF, level: { $exists: false } })
      .select({ roleId: 1 })
      .exec();
    return row?.roleId ?? null;
  }

  async setBoundary(
    guildId: GuildId,
    roleId: RoleId,
    tier: StaffTier,
  ): Promise<HydratedDocument<RoleConfig>> {
    if (!STAFF_TIER_BOUNDARIES.includes(tier)) {
      throw new ValidationError("Unknown staff tier boundary", { tier });
    }
    const row = await this.get(guildId, roleId);
    if (!row || row.level === undefined || row.level === null) {
      throw new ValidationError("BOUNDARY_NOT_ON_LADDER", { guildId, roleId, tier });
    }

    const existing = await this.getBoundaryRoles(guildId);
    const order = [...STAFF_TIER_BOUNDARIES];
    const index = order.indexOf(tier);
    for (let i = 0; i < order.length; i += 1) {
      if (i === index) continue;
      const other = existing[order[i] as StaffTier];
      if (!other || other.roleId === roleId) continue;
      if (other.level === undefined || other.level === null) continue;
      const mustBeBelow = i < index;
      if (mustBeBelow && other.level >= row.level) {
        throw new ValidationError("BOUNDARY_OUT_OF_ORDER", { tier, roleId, conflict: order[i] });
      }
      if (!mustBeBelow && other.level <= row.level) {
        throw new ValidationError("BOUNDARY_OUT_OF_ORDER", { tier, roleId, conflict: order[i] });
      }
    }

    await this.model
      .updateMany({ guildId, boundary: tier, roleId: { $ne: roleId } }, { $unset: { boundary: "" } })
      .exec();
    const doc = await this.model
      .findOneAndUpdate({ guildId, roleId }, { $set: { boundary: tier } }, { returnDocument: "after" })
      .exec();
    invalidateRoleConfig(guildId);
    return doc as HydratedDocument<RoleConfig>;
  }

  async unsetBoundary(guildId: GuildId, tier: StaffTier): Promise<number> {
    const result = await this.model
      .updateMany({ guildId, boundary: tier }, { $unset: { boundary: "" } })
      .exec();
    invalidateRoleConfig(guildId);
    return result.modifiedCount ?? 0;
  }

  async getBoundaryRoles(guildId: GuildId): Promise<Partial<Record<StaffTier, RoleConfig>>> {
    const rows = await this.model
      .find({ guildId, boundary: { $exists: true } })
      .select({ roleId: 1, level: 1, boundary: 1, type: 1 })
      .exec();
    const out: Partial<Record<StaffTier, RoleConfig>> = {};
    for (const row of rows) if (row.boundary) out[row.boundary] = row;
    return out;
  }

  getStartRole(guildId: GuildId): Promise<HydratedDocument<RoleConfig> | null> {
    return this.getByType(guildId, RoleConfigType.START);
  }

  getEndRole(guildId: GuildId): Promise<HydratedDocument<RoleConfig> | null> {
    return this.getByType(guildId, RoleConfigType.END);
  }

  getAccessRoleIds(guildId: GuildId): Promise<RoleId[]> {
    return this.model
      .find({ guildId, type: RoleConfigType.ACCESS })
      .select({ roleId: 1 })
      .exec()
      .then((rows) => rows.map((r) => r.roleId));
  }

  getIgnoredRoleIds(guildId: GuildId): Promise<RoleId[]> {
    return this.model
      .find({ guildId, type: RoleConfigType.IGNORE })
      .select({ roleId: 1 })
      .exec()
      .then((rows) => rows.map((r) => r.roleId));
  }

  async rebuildLadder(
    guildId: GuildId,
    orderedRoleIds: readonly RoleId[],
  ): Promise<StaffRoleLevel[]> {
    if (orderedRoleIds.length === 0) {
      throw new ValidationError("لازم يحتوي السلّم على رتبة البداية على الأقل");
    }
    const unique = new Set(orderedRoleIds);
    if (unique.size !== orderedRoleIds.length) {
      throw new ValidationError("السلّم فيه رتب مكررة");
    }

    const last = orderedRoleIds.length - 1;
    const ops: Record<string, unknown>[] = orderedRoleIds.map((roleId, index) => {
      const type =
        index === 0
          ? RoleConfigType.START
          : index === last
            ? RoleConfigType.END
            : RoleConfigType.STAFF;
      return {
        updateOne: {
          filter: { guildId, roleId },
          update: { $set: { type, level: index } },
          upsert: true,
        },
      };
    });

    ops.push({
      deleteMany: {
        filter: {
          guildId,
          level: { $gte: 0 },
          roleId: { $nin: orderedRoleIds as RoleId[] },
        },
      },
    });

    await this.model.bulkWrite(ops as never);
    invalidateRoleConfig(guildId);
    return this.getStaffRoleLevels(guildId);
  }
}

export const roleConfigService = new RoleConfigService();
