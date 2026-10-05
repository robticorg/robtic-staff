import type { Guild, GuildMember } from "discord.js";
import { logger } from "../../../../shared/utils/logger.ts";
import { HiddenStaffModel } from "../models/hidden-staff.model.ts";
import { hiddenStaffRepository } from "../repositories/hidden-staff.repository.ts";
import { highestHiddenLevel } from "./hidden-staff-hierarchy.ts";
import { hiddenStaffHierarchyService } from "./hidden-staff-hierarchy.service.ts";

const log = logger.child("hidden-staff:sync");

export type HiddenSyncChange = "ACTIVATED" | "LEVEL_CHANGED" | "DEACTIVATED" | "UNCHANGED";

export function decideHiddenSync(
  actualLevel: number,
  stored: { active: boolean; currentLevel: number } | null,
): HiddenSyncChange {
  if (actualLevel > 0) {
    if (!stored?.active) return "ACTIVATED";
    return stored.currentLevel === actualLevel ? "UNCHANGED" : "LEVEL_CHANGED";
  }
  return stored?.active ? "DEACTIVATED" : "UNCHANGED";
}

export class HiddenStaffLevelSyncService {
  async syncMember(member: GuildMember): Promise<HiddenSyncChange> {
    const hierarchy = await hiddenStaffHierarchyService.getHiddenHierarchy(member.guild);
    if (hierarchy.problem) return "UNCHANGED";
    const level = highestHiddenLevel(hierarchy, member.roles.cache.keys());
    const stored = await hiddenStaffRepository.get(member.guild.id, member.id);
    const change = decideHiddenSync(level, stored);
    if (change === "ACTIVATED") await hiddenStaffRepository.activate({ guildId: member.guild.id, userId: member.id, level });
    else if (change === "LEVEL_CHANGED") await hiddenStaffRepository.setLevel(member.guild.id, member.id, level);
    else if (change === "DEACTIVATED") await hiddenStaffRepository.deactivate(member.guild.id, member.id, null);
    return change;
  }

  async handleRoleChange(before: ReadonlySet<string>, member: GuildMember): Promise<void> {
    const hierarchy = await hiddenStaffHierarchyService.getHiddenHierarchy(member.guild);
    if (hierarchy.problem) return;
    const hiddenRoleIds = new Set(hierarchy.levels.map((rung) => rung.roleId));
    const after = new Set(member.roles.cache.keys());
    const touched = [...hiddenRoleIds].some((roleId) => before.has(roleId) !== after.has(roleId));
    if (touched) await this.syncMember(member);
  }

  async syncGuild(guild: Guild): Promise<Record<HiddenSyncChange, number>> {
    const counts: Record<HiddenSyncChange, number> = { ACTIVATED: 0, LEVEL_CHANGED: 0, DEACTIVATED: 0, UNCHANGED: 0 };
    const hierarchy = await hiddenStaffHierarchyService.getHiddenHierarchy(guild);
    if (hierarchy.problem) return counts;
    const hiddenRoleIds = new Set(hierarchy.levels.map((rung) => rung.roleId));
    const stored = await HiddenStaffModel.find({ guildId: guild.id, active: true }, { userId: 1 }).lean().exec();
    const storedIds = new Set(stored.map((row) => row.userId));

    const members = await guild.members.fetch().catch(() => null);
    if (!members) return counts;
    for (const member of members.values()) {
      const holdsHidden = [...member.roles.cache.keys()].some((roleId) => hiddenRoleIds.has(roleId));
      if (!holdsHidden && !storedIds.has(member.id)) continue;
      try {
        counts[await this.syncMember(member)] += 1;
      } catch (err) {
        log.warn(`hidden sync failed for ${member.id} in ${guild.id}`, err);
      }
    }
    log.info(
      `hidden staff synced in ${guild.id}: +${counts.ACTIVATED} ~${counts.LEVEL_CHANGED} -${counts.DEACTIVATED}`,
    );
    return counts;
  }
}

export const hiddenStaffLevelSyncService = new HiddenStaffLevelSyncService();
