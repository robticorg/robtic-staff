import type { GuildMember } from "discord.js";
import { hiddenStaffVisibilityService } from "../../staff/hidden/index.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";

export interface StatsAccess {
  ok: boolean;
  detailed: boolean;
  hidden?: boolean;
}

export async function canViewStats(
  viewer: GuildMember,
  targetUserId: string,
): Promise<StatsAccess> {
  if (viewer.id !== targetUserId && (await hiddenStaffVisibilityService.isHiddenStaff(viewer, targetUserId))) {
    return (await hiddenStaffVisibilityService.canViewHiddenStats(viewer, targetUserId))
      ? { ok: true, detailed: true }
      : { ok: false, detailed: false, hidden: true };
  }

  const isManager = await staffPermissionService.isStaffManager(viewer);
  if (isManager) return { ok: true, detailed: true };

  const isStaff = await staffPermissionService.canActAsStaff(viewer);
  if (!isStaff) return { ok: false, detailed: false };

  return { ok: viewer.id === targetUserId, detailed: false };
}

export async function canViewLeaderboard(viewer: GuildMember): Promise<boolean> {
  if (await staffPermissionService.isStaffManager(viewer)) return true;
  return staffPermissionService.canActAsStaff(viewer);
}
