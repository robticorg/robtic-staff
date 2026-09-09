import type { GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { roleConfigService, type StaffRoleLevel } from "../services/role-config.service.ts";

export function getStaffRoleLevels(guildId: GuildId): Promise<StaffRoleLevel[]> {
  return roleConfigService.getStaffRoleLevels(guildId);
}

export function getStaffLevel(roleId: RoleId, guildId: GuildId): Promise<number | null> {
  return roleConfigService.getStaffLevel(guildId, roleId);
}

export function getHighestStaffLevel(
  member: GuildMember,
  guildId: GuildId,
): Promise<number | null> {
  const roleIds = [...member.roles.cache.keys()];
  return roleConfigService.getHighestStaffLevel(guildId, roleIds);
}
