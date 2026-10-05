import type { Guild, GuildMember } from "discord.js";
import type { UserId } from "../../../../shared/types/index.ts";
import { hasAdminAccess } from "../../../access/index.ts";
import { isHiddenStaffMember } from "./hidden-staff-state.ts";

export function decideHiddenManagement(input: { actorIsAdministrator: boolean; targetIsHidden: boolean }): boolean {
  return input.targetIsHidden ? input.actorIsAdministrator : true;
}

export class HiddenStaffAuthorizationService {
  isHiddenStaff(guild: Guild, userId: UserId, member?: GuildMember | null): Promise<boolean> {
    return isHiddenStaffMember(guild, userId, member);
  }

  isHiddenManager(member: GuildMember): boolean {
    return hasAdminAccess(member);
  }

  canManageHiddenStaff(actor: GuildMember): boolean {
    return this.isHiddenManager(actor);
  }

  canPromoteHiddenStaff(actor: GuildMember): boolean {
    return this.isHiddenManager(actor);
  }

  canDemoteHiddenStaff(actor: GuildMember): boolean {
    return this.isHiddenManager(actor);
  }

  canAcceptHiddenStaff(actor: GuildMember): boolean {
    return this.isHiddenManager(actor);
  }

  async canMoveNormalLevel(actor: GuildMember, target: GuildMember): Promise<boolean> {
    return decideHiddenManagement({
      actorIsAdministrator: this.isHiddenManager(actor),
      targetIsHidden: await this.isHiddenStaff(target.guild, target.id, target),
    });
  }
}

export const hiddenStaffAuthorizationService = new HiddenStaffAuthorizationService();
