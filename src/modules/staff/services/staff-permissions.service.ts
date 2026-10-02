import { type GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType, type StaffTier } from "../../configuration/types/enums.ts";
import { getHierarchy, highestLevelFromRoleIds } from "../../configuration/utils/staff-levels.ts";
import { responsibilityPermissionService } from "../../responsibilities/services/responsibility-permission.service.ts";
import { hasAdminAccess } from "../../access/index.ts";

export class StaffPermissionService {
  async staffRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
    const [ladder, generalRoleId] = await Promise.all([
      roleConfigService.getStaffRoleLevels(guildId),

      roleConfigService.getGeneralStaffRoleId(guildId),
    ]);
    const ids = new Set<RoleId>(ladder.map((r) => r.roleId));
    if (generalRoleId) ids.add(generalRoleId);
    return ids;
  }

  async isStaff(member: GuildMember): Promise<boolean> {
    const ids = await this.staffRoleIds(member.guild.id);
    return member.roles.cache.some((role) => ids.has(role.id));
  }

  isAdministrator(member: GuildMember): boolean {
    return hasAdminAccess(member);
  }

  async canActAsStaff(member: GuildMember): Promise<boolean> {
    if (this.isAdministrator(member)) return true;
    return this.isStaff(member);
  }

  async isAtLeastTier(member: GuildMember, tier: StaffTier): Promise<boolean> {
    if (this.isAdministrator(member)) return true;

    const hierarchy = await getHierarchy(member.guild.id);
    const boundary = hierarchy.boundaryLevels[tier];
    if (boundary === null) return false;

    const level = highestLevelFromRoleIds(hierarchy, member.roles.cache.keys());
    return level !== null && level >= boundary;
  }

  async isStaffManager(member: GuildMember): Promise<boolean> {
    if (this.isAdministrator(member)) return true;
    return responsibilityPermissionService.holds(member, RoleConfigType.STAFF_MANAGER);
  }

  canManageStaff(member: GuildMember): Promise<boolean> {
    return this.isStaffManager(member);
  }

  async isApplyManager(member: GuildMember): Promise<boolean> {
    if (this.isAdministrator(member)) return true;
    return responsibilityPermissionService.holds(member, RoleConfigType.APPLY_MANAGER);
  }
}

export const staffPermissionService = new StaffPermissionService();
