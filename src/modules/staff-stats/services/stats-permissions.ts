import type { GuildMember } from "discord.js";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";

export interface StatsAccess {
  ok: boolean;
  detailed: boolean;
}

export async function canViewStats(
  viewer: GuildMember,
  targetUserId: string,
): Promise<StatsAccess> {
  const isManager = await staffPermissionService.isStaffManager(viewer);
  if (isManager) return { ok: true, detailed: true };

  const isStaff = await staffPermissionService.isStaff(viewer);
  if (!isStaff) return { ok: false, detailed: false };

  return { ok: viewer.id === targetUserId, detailed: false };
}

export async function canViewLeaderboard(viewer: GuildMember): Promise<boolean> {
  if (await staffPermissionService.isStaffManager(viewer)) return true;
  return staffPermissionService.isStaff(viewer);
}
