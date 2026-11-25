import type { GuildMember } from "discord.js";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import type { RoleConfigType } from "../../configuration/types/enums.ts";

/** Whether a member holds the role set for a manager slot (Staff / Owner / Apply / Transfer Manager) on the dashboard. */
export const managerRoleService = {
  async holds(member: GuildMember, slot: RoleConfigType): Promise<boolean> {
    const configured = await roleConfigService.getByType(member.guild.id, slot);
    return !!configured && member.roles.cache.has(configured.roleId);
  },
};
