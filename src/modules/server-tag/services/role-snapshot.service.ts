import { PermissionFlagsBits, type Guild, type GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import {
  STAFF_TAG_MANAGED_ROLE_TYPES,
  STAFF_TAG_PROTECTED_ROLE_TYPES,
} from "../../../data/server-tag/config.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";

const log = logger.child("server-tag:roles");

export interface RemoveOutcome {
  removed: RoleId[];

  blocked: RoleId[];
}

export interface RestoreOutcome {
  restored: RoleId[];

  missing: RoleId[];

  blocked: RoleId[];

  failed: boolean;
}

export class RoleSnapshotService {
  async managedStaffRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
    const managedSlots = STAFF_TAG_MANAGED_ROLE_TYPES.filter(
      (type) => type !== RoleConfigType.STAFF,
    );
    const [ladder, generalRoleId, ...slots] = await Promise.all([
      roleConfigService.getStaffRoleLevels(guildId),
      roleConfigService.getGeneralStaffRoleId(guildId),
      ...managedSlots.map((type) => roleConfigService.getByType(guildId, type)),
    ]);

    const protectedIds = await this.protectedRoleIds(guildId);

    const ids = new Set<RoleId>();
    for (const rung of ladder) ids.add(rung.roleId);
    if (generalRoleId) ids.add(generalRoleId);
    for (const slot of slots) if (slot) ids.add(slot.roleId);
    for (const id of protectedIds) ids.delete(id);
    return ids;
  }

  async protectedRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
    const rows = await Promise.all(
      STAFF_TAG_PROTECTED_ROLE_TYPES.map((type) => roleConfigService.listByType(guildId, type)),
    );
    const ids = new Set<RoleId>();
    for (const list of rows) for (const row of list) ids.add(row.roleId);
    return ids;
  }

  getTagRoleId(guildId: GuildId): Promise<RoleId | null> {
    return roleConfigService
      .getByType(guildId, RoleConfigType.TAG)
      .then((row) => row?.roleId ?? null);
  }

  async captureStaffRoles(member: GuildMember, guildId: GuildId): Promise<RoleId[]> {
    const managed = await this.managedStaffRoleIds(guildId);
    return [...managed].filter((id) => member.roles.cache.has(id));
  }

  botCanManage(guild: Guild, roleId: RoleId): boolean {
    const me = guild.members.me;
    const role = guild.roles.cache.get(roleId);
    if (!me || !role) return false;
    if (role.managed) return false;
    return me.roles.highest.comparePositionTo(role) > 0;
  }

  botCanManageRoles(guild: Guild): boolean {
    return guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) ?? false;
  }

  async removeStaffRoles(
    member: GuildMember,
    roleIds: readonly RoleId[],
    reason: string,
  ): Promise<RemoveOutcome> {
    const present = roleIds.filter((id) => member.roles.cache.has(id));
    const removable: RoleId[] = [];
    const blocked: RoleId[] = [];
    for (const id of present) {
      if (this.botCanManage(member.guild, id)) removable.push(id);
      else blocked.push(id);
    }

    if (blocked.length > 0) {
      log.warn(
        `cannot remove ${blocked.length} role(s) from ${member.id} in ${member.guild.id} — hierarchy or managed role`,
        { blocked },
      );
    }
    if (removable.length === 0) return { removed: [], blocked };

    try {
      await member.roles.remove(removable, reason);
      return { removed: removable, blocked };
    } catch (err) {
      log.error(`staff role removal failed for ${member.id} in ${member.guild.id}`, err);
      return { removed: [], blocked: [...blocked, ...removable] };
    }
  }

  async restoreStaffRoles(
    member: GuildMember,
    savedRoleIds: readonly RoleId[],
    reason: string,
  ): Promise<RestoreOutcome> {
    const guildRoles = member.guild.roles.cache;
    const missing: RoleId[] = [];
    const blocked: RoleId[] = [];
    const restorable: RoleId[] = [];

    for (const id of savedRoleIds) {
      if (!guildRoles.has(id)) {
        missing.push(id);
        continue;
      }
      if (!this.botCanManage(member.guild, id)) {
        blocked.push(id);
        continue;
      }
      restorable.push(id);
    }

    if (missing.length > 0) {
      log.warn(
        `restore for ${member.id} in ${member.guild.id}: ${missing.length} saved role(s) no longer exist`,
        { missing },
      );
    }
    if (blocked.length > 0) {
      log.warn(
        `restore for ${member.id} in ${member.guild.id}: ${blocked.length} role(s) above the bot`,
        { blocked },
      );
    }

    const toAdd = restorable.filter((id) => !member.roles.cache.has(id));
    if (toAdd.length === 0) return { restored: restorable, missing, blocked, failed: false };

    try {
      await member.roles.add(toAdd, reason);
      return { restored: restorable, missing, blocked, failed: false };
    } catch (err) {
      log.error(`staff role restore failed for ${member.id} in ${member.guild.id}`, err);
      return { restored: [], missing, blocked, failed: true };
    }
  }

  async addTagRole(member: GuildMember, tagRoleId: RoleId, reason: string): Promise<boolean> {
    if (member.roles.cache.has(tagRoleId)) return false;
    if (!this.botCanManage(member.guild, tagRoleId)) {
      log.warn(`cannot grant tag role ${tagRoleId} in ${member.guild.id} — hierarchy`);
      return false;
    }
    try {
      await member.roles.add(tagRoleId, reason);
      return true;
    } catch (err) {
      log.error(`tag role grant failed for ${member.id} in ${member.guild.id}`, err);
      return false;
    }
  }

  async removeTagRole(member: GuildMember, tagRoleId: RoleId, reason: string): Promise<boolean> {
    if (!member.roles.cache.has(tagRoleId)) return false;
    if (!this.botCanManage(member.guild, tagRoleId)) {
      log.warn(`cannot remove tag role ${tagRoleId} in ${member.guild.id} — hierarchy`);
      return false;
    }
    try {
      await member.roles.remove(tagRoleId, reason);
      return true;
    } catch (err) {
      log.error(`tag role removal failed for ${member.id} in ${member.guild.id}`, err);
      return false;
    }
  }
}

export const roleSnapshotService = new RoleSnapshotService();
