import type { GuildMember } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";

export interface ReviewerConflictInput {
  reviewerId: UserId;
  issuerId?: UserId | null;
  approverId?: UserId | null;
  investigatorId?: UserId | null;
}

export function isReviewerConflicted(input: ReviewerConflictInput): boolean {
  const { reviewerId } = input;
  return (
    reviewerId === input.issuerId ||
    reviewerId === input.approverId ||
    reviewerId === input.investigatorId
  );
}

export class AppealPermissionService {
  async canReview(member: GuildMember): Promise<boolean> {
    const appealRole = await roleConfigService.getByType(
      member.guild.id,
      RoleConfigType.APPEAL_MANAGER,
    );
    if (appealRole && member.roles.cache.has(appealRole.roleId)) return true;
    return staffPermissionService.isStaffManager(member);
  }

  async appealManagerRoleId(guildId: GuildId): Promise<string | null> {
    const row = await roleConfigService.getByType(guildId, RoleConfigType.APPEAL_MANAGER);
    return row?.roleId ?? null;
  }
}

export const appealPermissionService = new AppealPermissionService();
