import type { GuildMember } from "discord.js";
import type { UserId } from "../../../../shared/types/index.ts";
import { hasAdminAccess } from "../../../access/index.ts";
import { hiddenLevelOf, isHiddenStaffMember } from "./hidden-staff-state.ts";

export interface HiddenVisibilityFacts {
  isSelf: boolean;
  viewerIsAdministrator: boolean;
  targetIsHidden: boolean;
  viewerHiddenLevel: number;
  targetHiddenLevel: number;
}

export function decideHiddenVisibility(facts: HiddenVisibilityFacts): boolean {
  if (!facts.targetIsHidden) return true;
  if (facts.isSelf || facts.viewerIsAdministrator) return true;
  return facts.viewerHiddenLevel > 0 && facts.viewerHiddenLevel > facts.targetHiddenLevel;
}

export class HiddenStaffVisibilityService {
  isHiddenStaff(viewer: GuildMember, targetId: UserId, target?: GuildMember | null): Promise<boolean> {
    return isHiddenStaffMember(viewer.guild, targetId, target);
  }

  isAdministrator(member: GuildMember): boolean {
    return hasAdminAccess(member);
  }

  async canViewHiddenStats(viewer: GuildMember, targetId: UserId): Promise<boolean> {
    if (viewer.id === targetId || this.isAdministrator(viewer)) return true;
    const target = await viewer.guild.members.fetch(targetId).catch(() => null);
    const targetIsHidden = await this.isHiddenStaff(viewer, targetId, target);
    if (!targetIsHidden) return true;
    return decideHiddenVisibility({
      isSelf: false,
      viewerIsAdministrator: false,
      targetIsHidden,
      viewerHiddenLevel: await hiddenLevelOf(viewer),
      targetHiddenLevel: target ? await hiddenLevelOf(target) : 0,
    });
  }

  canViewHiddenDetails(viewer: GuildMember, targetId: UserId): Promise<boolean> {
    return this.canViewHiddenStats(viewer, targetId);
  }
}

export const hiddenStaffVisibilityService = new HiddenStaffVisibilityService();
