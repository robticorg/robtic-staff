import type { GuildMember } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { CACHE_ENABLED, TtlCache } from "../../../libs/cache/index.ts";
import { responsibilityLimits } from "../../../data/responsibilities/config.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import type { RoleConfigType } from "../../configuration/types/enums.ts";
import { responsibilityAssignmentRepository } from "../repositories/responsibility-assignment.repository.ts";
import { responsibilityRepository } from "../repositories/responsibility.repository.ts";

const cache = new TtlCache<ReadonlySet<string>>({ defaultTtlMs: responsibilityLimits.permissionCacheTtlMs });
const key = (guildId: GuildId, userId: UserId) => `${guildId}:${userId}`;

export class ResponsibilityPermissionService {
  async activePermissions(guildId: GuildId, userId: UserId): Promise<ReadonlySet<string>> {
    const load = async (): Promise<ReadonlySet<string>> => {
      const assignments = await responsibilityAssignmentRepository.activeFor(guildId, userId);
      const responsibilities = await responsibilityRepository.listByIds(
        guildId,
        assignments.map((a) => a.responsibilityId),
      );
      return new Set(responsibilities.filter((r) => !r.disabled).map((r) => r.permission));
    };
    return CACHE_ENABLED ? cache.getOrSet(key(guildId, userId), load) : load();
  }

  async holds(member: GuildMember, permission: RoleConfigType): Promise<boolean> {
    const configured = await roleConfigService.getByType(member.guild.id, permission);
    if (configured && member.roles.cache.has(configured.roleId)) return true;
    return (await this.activePermissions(member.guild.id, member.id)).has(permission);
  }

  invalidate(guildId: GuildId, userId?: UserId): void {
    if (userId) cache.delete(key(guildId, userId));
    else cache.deleteByPrefix(`${guildId}:`);
  }
}

export const responsibilityPermissionService = new ResponsibilityPermissionService();
