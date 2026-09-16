import type { Guild, Role } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { RoleConfigModel } from "../models/role-config.model.ts";
import { roleConfigService } from "./role-config.service.ts";
import { RoleConfigType } from "../types/enums.ts";

const log = logger.child("access-roles");

export const AccessRoleRejection = {
  EVERYONE: "EVERYONE",
  MANAGED: "MANAGED",
  UNMANAGEABLE: "UNMANAGEABLE",
  MISSING: "MISSING",
  ALREADY_CONFIGURED: "ALREADY_CONFIGURED",

  RESERVED: "RESERVED",
} as const;
export type AccessRoleRejection =
  (typeof AccessRoleRejection)[keyof typeof AccessRoleRejection];

export interface RejectedRole {
  roleId: RoleId;
  reason: AccessRoleRejection;

  conflict?: RoleConfigType;
}

export interface AccessRoleUpdate {
  added: RoleId[];
  rejected: RejectedRole[];
  total: number;
}

export class StaffAccessRoleService {
  getAccessRoles(guildId: GuildId): Promise<RoleId[]> {
    return roleConfigService.getAccessRoleIds(guildId);
  }

  async isAccessRole(roleId: RoleId, guildId: GuildId): Promise<boolean> {
    const row = await roleConfigService.get(guildId, roleId);
    return row?.type === RoleConfigType.ACCESS;
  }

  resolveRoleRange(guild: Guild, fromRoleId: RoleId, toRoleId: RoleId): Role[] {
    const from = guild.roles.cache.get(fromRoleId);
    const to = guild.roles.cache.get(toRoleId);
    if (!from || !to) {
      throw new ValidationError("ACCESS_RANGE_ROLE_MISSING", { fromRoleId, toRoleId });
    }

    const low = Math.min(from.position, to.position);
    const high = Math.max(from.position, to.position);

    return [...guild.roles.cache.values()]
      .filter((role) => role.id !== guild.id)
      .filter((role) => role.position >= low && role.position <= high)
      .sort((a, b) => a.position - b.position);
  }

  async addAccessRoles(guild: Guild, roles: readonly Role[]): Promise<AccessRoleUpdate> {
    const guildId = guild.id;
    const unique = new Map<RoleId, Role>();
    for (const role of roles) unique.set(role.id, role);

    const existing = new Set(await this.getAccessRoles(guildId));
    const me = guild.members.me;

    const added: RoleId[] = [];
    const rejected: RejectedRole[] = [];

    for (const role of unique.values()) {
      if (role.id === guildId) {
        rejected.push({ roleId: role.id, reason: AccessRoleRejection.EVERYONE });
        continue;
      }
      if (role.managed) {
        rejected.push({ roleId: role.id, reason: AccessRoleRejection.MANAGED });
        continue;
      }
      if (me && me.roles.highest.comparePositionTo(role) <= 0) {
        rejected.push({ roleId: role.id, reason: AccessRoleRejection.UNMANAGEABLE });
        continue;
      }
      if (existing.has(role.id)) {
        rejected.push({ roleId: role.id, reason: AccessRoleRejection.ALREADY_CONFIGURED });
        continue;
      }

      const current = await roleConfigService.get(guildId, role.id);
      if (current && current.type !== RoleConfigType.ACCESS) {
        rejected.push({
          roleId: role.id,
          reason: AccessRoleRejection.RESERVED,
          conflict: current.type,
        });
        continue;
      }

      added.push(role.id);
    }

    if (added.length > 0) {
      await RoleConfigModel.bulkWrite(
        added.map((roleId) => ({
          updateOne: {
            filter: { guildId, roleId },

            update: { $set: { type: RoleConfigType.ACCESS }, $unset: { level: "", boundary: "" } },
            upsert: true,
          },
        })) as never,
        { ordered: false },
      );

      await roleConfigService.touchGuild(guildId);
      log.info(`added ${added.length} access role(s) in ${guildId}`);
    }

    return { added, rejected, total: (await this.getAccessRoles(guildId)).length };
  }

  async addAccessRole(guild: Guild, role: Role): Promise<AccessRoleUpdate> {
    return this.addAccessRoles(guild, [role]);
  }

  async addAccessRoleRange(
    guild: Guild,
    fromRoleId: RoleId,
    toRoleId: RoleId,
  ): Promise<AccessRoleUpdate> {
    return this.addAccessRoles(guild, this.resolveRoleRange(guild, fromRoleId, toRoleId));
  }

  async removeAccessRole(guildId: GuildId, roleId: RoleId): Promise<boolean> {
    const removed = await this.removeAccessRoles(guildId, [roleId]);
    return removed > 0;
  }

  async removeAccessRoles(guildId: GuildId, roleIds: readonly RoleId[]): Promise<number> {
    if (roleIds.length === 0) return 0;
    const result = await RoleConfigModel.deleteMany({
      guildId,
      type: RoleConfigType.ACCESS,
      roleId: { $in: [...roleIds] },
    }).exec();
    const count = result.deletedCount ?? 0;
    if (count > 0) await roleConfigService.touchGuild(guildId);
    return count;
  }
}

export const staffAccessRoleService = new StaffAccessRoleService();
