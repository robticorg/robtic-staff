import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType, type StaffTier } from "../../configuration/types/enums.ts";
import { getHierarchy, highestLevelFromRoleIds } from "../../configuration/utils/staff-levels.ts";

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

  /**
   * Identity: does this member actually hold a Staff role? Deliberately NOT
   * folded with Administrator — callers that ask "is this person staff" to
   * decide what happens *to* them (the Server Tag restriction, a vacation
   * snapshot, a scan import) must not treat every admin as staff.
   *
   * For "may this person run a staff action", use `canActAsStaff`.
   */
  async isStaff(member: GuildMember): Promise<boolean> {
    const ids = await this.staffRoleIds(member.guild.id);
    return member.roles.cache.some((role) => ids.has(role.id));
  }

  isAdministrator(member: GuildMember): boolean {
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }

  /**
   * Authorization: an Administrator may run anything a staff member can, with
   * or without a Staff role. Every "staff only" command gate goes through this.
   */
  async canActAsStaff(member: GuildMember): Promise<boolean> {
    if (this.isAdministrator(member)) return true;
    return this.isStaff(member);
  }

  /**
   * True when the member's calculated Staff level reaches the tier's boundary.
   * Administrators always pass. Levels come from the hierarchy, never from a
   * Discord role position, and an unconfigured boundary grants nothing.
   */
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
    const managerRole = await roleConfigService.getByType(
      member.guild.id,
      RoleConfigType.STAFF_MANAGER,
    );
    return managerRole ? member.roles.cache.has(managerRole.roleId) : false;
  }

  canManageStaff(member: GuildMember): Promise<boolean> {
    return this.isStaffManager(member);
  }

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
