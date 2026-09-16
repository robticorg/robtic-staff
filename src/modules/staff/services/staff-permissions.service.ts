import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";

export class StaffPermissionService {
  async staffRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
    const [ladder, generalRoleId] = await Promise.all([
      roleConfigService.getStaffRoleLevels(guildId),
      // Must be the unlevelled marker — `getByType(STAFF)` can return a
      // numbered rung, which silently drops the @Staff role from the set.
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
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }

  async isStaffManager(member: GuildMember): Promise<boolean> {
    if (this.isAdministrator(member)) return true;
    const managerRole = await roleConfigService.getByType(
      member.guild.id,
      RoleConfigType.STAFF_MANAGER,
    );
    return managerRole ? member.roles.cache.has(managerRole.roleId) : false;
  }

  canManageStaff(member: GuildMember): Promise<boolean> {
    return this.isStaffManager(member);
  }

  /**
   * Apply Manager reviews staff applications (`!accept`) — deliberately its
   * own permission, not a Staff Manager privilege. Holding Staff Manager
   * alone must not grant it.
   */
  async isApplyManager(member: GuildMember): Promise<boolean> {
    if (this.isAdministrator(member)) return true;
    const applyRole = await roleConfigService.getByType(
      member.guild.id,
      RoleConfigType.APPLY_MANAGER,
    );
    return applyRole ? member.roles.cache.has(applyRole.roleId) : false;
  }
}

export const staffPermissionService = new StaffPermissionService();
