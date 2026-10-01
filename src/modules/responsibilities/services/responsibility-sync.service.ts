import type { GuildMember, PartialGuildMember } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { responsibilityAssignmentService } from "./responsibility-assignment.service.ts";
import { responsibilityLogService } from "./responsibility-log.service.ts";
import { responsibilityRoleService } from "./responsibility-role.service.ts";

const log = logger.child("responsibilities:sync");

export class ResponsibilitySyncService {
  async handleMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<number> {
    if (oldMember.partial) return 0;
    const removed = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));
    if (removed.size === 0) return 0;
    return this.restore(newMember, (roleId) => removed.has(roleId), true);
  }

  handleMemberJoin(member: GuildMember): Promise<number> {
    return this.restore(member, () => true, false);
  }

  private async restore(
    member: GuildMember,
    shouldRestore: (roleId: string) => boolean,
    logRestore: boolean,
  ): Promise<number> {
    try {
      const active = await responsibilityAssignmentService.getActiveResponsibilities(member.guild.id, member.id);
      let restored = 0;
      for (const { responsibility } of active) {
        const roleId = responsibility.roleId;
        if (!shouldRestore(roleId) || member.roles.cache.has(roleId)) continue;
        if (responsibilityRoleService.roleState(member.guild, roleId) !== "OK") continue;
        await responsibilityRoleService.grant(member, roleId, "Active responsibility — role restored");
        restored += 1;
        if (logRestore) {
          await responsibilityLogService.post(member.guild, {
            kind: "RESTORED",
            userId: member.id,
            title: responsibility.title,
            roleId,
            note: responsibilityMessages.log.restoredNote,
          });
        }
      }
      return restored;
    } catch (err) {
      log.warn(`responsibility role sync failed for ${member.id} in ${member.guild.id}`, err);
      return 0;
    }
  }
}

export const responsibilitySyncService = new ResponsibilitySyncService();
