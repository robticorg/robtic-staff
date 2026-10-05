import type { Guild } from "discord.js";
import type { RoleId } from "../../../../shared/types/index.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { hiddenStaffMessages } from "../../../../data/hidden-staff/messages.ts";
import { ladderSyncService } from "../../../configuration/services/ladder-sync.service.ts";
import { hiddenStaffConfigRepository, type HiddenConfigView } from "../repositories/hidden-staff-config.repository.ts";
import { HiddenConfigProblem, type HiddenHierarchy } from "./hidden-staff-hierarchy.ts";
import { hiddenStaffHierarchyService } from "./hidden-staff-hierarchy.service.ts";
import { HiddenStaffError } from "./hidden-staff.service.ts";

const log = logger.child("hidden-staff:config");
const CFG = hiddenStaffMessages.config;

export interface HiddenConfigOutcome {
  hierarchy: HiddenHierarchy;
  complete: boolean;
}

export class HiddenStaffConfigService {
  private async saveIfValid(guild: Guild, next: HiddenConfigView): Promise<HiddenConfigOutcome> {
    const hierarchy = await hiddenStaffHierarchyService.compute(guild, next);
    if (hierarchy.problem && hierarchy.problem !== HiddenConfigProblem.NOT_CONFIGURED) {
      throw new HiddenStaffError(CFG.problems[hierarchy.problem] ?? CFG.problems.NOT_CONFIGURED!);
    }
    await hiddenStaffConfigRepository.save(guild.id, next);
    await this.afterChange(guild);
    return { hierarchy, complete: hierarchy.problem === null };
  }

  private async afterChange(guild: Guild): Promise<void> {
    hiddenStaffHierarchyService.invalidate(guild.id);
    await ladderSyncService.sync(guild).catch((err) => log.warn(`normal ladder resync after hidden change failed`, err));
  }

  async setStart(guild: Guild, roleId: RoleId): Promise<HiddenConfigOutcome> {
    const current = await hiddenStaffConfigRepository.get(guild.id);
    return this.saveIfValid(guild, { ...current, hiddenStartRoleId: roleId });
  }

  async setEnd(guild: Guild, roleId: RoleId): Promise<HiddenConfigOutcome> {
    const current = await hiddenStaffConfigRepository.get(guild.id);
    return this.saveIfValid(guild, { ...current, hiddenEndRoleId: roleId });
  }

  async ignore(guild: Guild, roleId: RoleId): Promise<void> {
    const current = await hiddenStaffConfigRepository.get(guild.id);
    if (roleId === current.hiddenStartRoleId || roleId === current.hiddenEndRoleId) {
      throw new HiddenStaffError(CFG.ignoreEdge);
    }
    await hiddenStaffConfigRepository.addIgnored(guild.id, roleId);
    await this.afterChange(guild);
  }

  async unignore(guild: Guild, roleId: RoleId): Promise<boolean> {
    const removed = await hiddenStaffConfigRepository.removeIgnored(guild.id, roleId);
    if (removed) await this.afterChange(guild);
    return removed;
  }
}

export const hiddenStaffConfigService = new HiddenStaffConfigService();
