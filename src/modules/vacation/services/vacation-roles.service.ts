import { PermissionFlagsBits, type Guild, type GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";

const log = logger.child("vacation:roles");
const M = vacationMessages;

export class VacationRoleError extends DomainError {}

export interface RestoreOutcome {
  restored: RoleId[];
  missing: RoleId[];
}

export class VacationRoleService {
  getVacationRoleId(guildId: GuildId): Promise<RoleId | null> {
    return roleConfigService
      .getByType(guildId, RoleConfigType.VACATION)
      .then((row) => row?.roleId ?? null);
  }

  staffRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
    return staffPermissionService.staffRoleIds(guildId);
  }

  async snapshot(member: GuildMember, guildId: GuildId): Promise<RoleId[]> {
    const staffIds = await this.staffRoleIds(guildId);
    return [...staffIds].filter((id) => member.roles.cache.has(id));
  }

  private botCanManage(guild: Guild, roleId: RoleId): boolean {
    const me = guild.members.me;
    const role = guild.roles.cache.get(roleId);
    if (!me || !role) return false;
    return me.roles.highest.comparePositionTo(role) > 0;
  }

  async preflight(
    guild: Guild,
    vacationRoleId: RoleId,
    snapshotRoleIds: readonly RoleId[],
  ): Promise<void> {
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new VacationRoleError("VACATION_BOT_PERM", M.break.botMissingPermission);
    }
    if (!guild.roles.cache.has(vacationRoleId)) {
      throw new VacationRoleError("VACATION_ROLE_MISSING", M.break.roleMissing);
    }
    if (!this.botCanManage(guild, vacationRoleId)) {
      throw new VacationRoleError("VACATION_HIERARCHY", M.break.hierarchy);
    }
    for (const roleId of snapshotRoleIds) {
      if (guild.roles.cache.has(roleId) && !this.botCanManage(guild, roleId)) {
        throw new VacationRoleError("VACATION_HIERARCHY", M.break.hierarchy);
      }
    }
  }

  async removeStaffRoles(
    member: GuildMember,
    roleIds: readonly RoleId[],
    reason: string,
  ): Promise<void> {
    const present = roleIds.filter((id) => member.roles.cache.has(id));
    if (present.length === 0) return;
    try {
      await member.roles.remove(present, reason);
    } catch (err) {
      throw new VacationRoleError("VACATION_DISCORD_FAILED", M.break.discordFailed, {
        cause: String(err),
      });
    }
  }

  async applyVacationRole(
    member: GuildMember,
    vacationRoleId: RoleId,
    reason: string,
  ): Promise<void> {
    if (member.roles.cache.has(vacationRoleId)) return;
    try {
      await member.roles.add(vacationRoleId, reason);
    } catch (err) {
      throw new VacationRoleError("VACATION_DISCORD_FAILED", M.break.discordFailed, {
        cause: String(err),
      });
    }
  }

  async rollbackStaffRoles(
    member: GuildMember,
    roleIds: readonly RoleId[],
    reason: string,
  ): Promise<void> {
    const addable = roleIds.filter(
      (id) => member.guild.roles.cache.has(id) && !member.roles.cache.has(id),
    );
    if (addable.length === 0) return;
    await member.roles.add(addable, reason).catch((err) => log.warn("rollback re-add failed", err));
  }

  async removeVacationRole(
    member: GuildMember,
    vacationRoleId: RoleId,
    reason: string,
  ): Promise<void> {
    if (!member.roles.cache.has(vacationRoleId)) return;
    await member.roles
      .remove(vacationRoleId, reason)
      .catch((err) => log.warn("vacation role removal failed", err));
  }

  async restoreSavedRoles(
    member: GuildMember,
    savedRoleIds: readonly RoleId[],
    reason: string,
  ): Promise<RestoreOutcome> {
    const guildRoles = member.guild.roles.cache;
    const restored: RoleId[] = [];
    const missing: RoleId[] = [];
    for (const id of savedRoleIds) {
      if (guildRoles.has(id)) restored.push(id);
      else missing.push(id);
    }
    if (missing.length > 0) {
      log.warn(
        `restore for ${member.id} in ${member.guild.id}: ${missing.length} saved role(s) gone`,
        { missing },
      );
    }
    const toAdd = restored.filter((id) => !member.roles.cache.has(id));
    if (toAdd.length > 0) {
      await member.roles
        .add(toAdd, reason)
        .catch((err) => log.warn(`restore add failed for ${member.id}`, err));
    }
    return { restored, missing };
  }
}

export const vacationRoleService = new VacationRoleService();
