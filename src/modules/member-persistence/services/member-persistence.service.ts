import type { GuildMember, PartialGuildMember } from "discord.js";
import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { PERSISTENT_ROLE_TYPES } from "../../../data/member-persistence/config.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { punishmentService } from "../../punishment/services/punishment.service.ts";
import { PunishmentType } from "../../punishment/types/enums.ts";
import { PersistentMemberRoleModel } from "../models/persistent-member-role.model.ts";

const log = logger.child("member-persistence");

export interface RoleDiff {
  gained: RoleConfigType[];
  lost: RoleConfigType[];
}

export function diffPersistentRoles(
  configured: ReadonlyMap<RoleConfigType, RoleId>,
  before: ReadonlySet<RoleId>,
  after: ReadonlySet<RoleId>,
): RoleDiff {
  const gained: RoleConfigType[] = [];
  const lost: RoleConfigType[] = [];
  for (const [type, roleId] of configured) {
    const had = before.has(roleId);
    const has = after.has(roleId);
    if (!had && has) gained.push(type);
    if (had && !has) lost.push(type);
  }
  return { gained, lost };
}

export function isJailActive(
  jail: { expiresAt?: Date | null } | null,
  now: Date = new Date(),
): boolean {
  if (!jail) return false;
  return !jail.expiresAt || jail.expiresAt.getTime() > now.getTime();
}

export class MemberPersistenceService {
  async configuredRoles(guildId: GuildId): Promise<Map<RoleConfigType, RoleId>> {
    const rows = await Promise.all(
      PERSISTENT_ROLE_TYPES.map(async (type) => [type, await roleConfigService.getByType(guildId, type)] as const),
    );
    const map = new Map<RoleConfigType, RoleId>();
    for (const [type, row] of rows) if (row) map.set(type, row.roleId);
    return map;
  }

  async recordRoleChange(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ): Promise<void> {
    if (oldMember.partial) return;
    const configured = await this.configuredRoles(newMember.guild.id);
    if (configured.size === 0) return;

    const diff = diffPersistentRoles(
      configured,
      new Set(oldMember.roles.cache.keys()),
      new Set(newMember.roles.cache.keys()),
    );
    await this.apply(newMember.guild.id, newMember.id, diff);
  }

  async snapshotOnLeave(member: GuildMember | PartialGuildMember): Promise<void> {
    if (member.partial) return;
    const configured = await this.configuredRoles(member.guild.id);
    const held = new Set(member.roles.cache.keys());
    const gained: RoleConfigType[] = [];
    const lost: RoleConfigType[] = [];
    for (const [type, roleId] of configured) (held.has(roleId) ? gained : lost).push(type);
    await this.apply(member.guild.id, member.id, { gained, lost });
  }

  async restoreOnJoin(member: GuildMember): Promise<RoleId[]> {
    const guildId = member.guild.id;
    const [rows, configured, jailRole, jail] = await Promise.all([
      PersistentMemberRoleModel.find({ guildId, userId: member.id }).exec(),
      this.configuredRoles(guildId),
      roleConfigService.getByType(guildId, RoleConfigType.JAIL),
      punishmentService.findLatestExecuted(guildId, member.id, PunishmentType.JAIL),
    ]);

    const restore = new Set<RoleId>();
    for (const row of rows) {
      const roleId = configured.get(row.type);
      if (roleId) restore.add(roleId);
    }
    if (jailRole && isJailActive(jail)) restore.add(jailRole.roleId);

    const toAdd = [...restore].filter(
      (roleId) => member.guild.roles.cache.has(roleId) && !member.roles.cache.has(roleId),
    );
    if (toAdd.length === 0) return [];

    await member.roles
      .add(toAdd, "Restoring persistent blacklist / jail roles on rejoin")
      .catch((err) => log.warn(`persistent role restore failed for ${member.id} in ${guildId}`, err));
    log.info(`restored ${toAdd.length} persistent role(s) for ${member.id} in ${guildId}`);
    return toAdd;
  }

  private async apply(guildId: GuildId, userId: UserId, diff: RoleDiff): Promise<void> {
    for (const type of diff.gained) {
      await PersistentMemberRoleModel.updateOne(
        { guildId, userId, type },
        { $setOnInsert: { guildId, userId, type } },
        { upsert: true },
      ).exec();
    }
    if (diff.lost.length > 0) {
      await PersistentMemberRoleModel.deleteMany({ guildId, userId, type: { $in: diff.lost } }).exec();
    }
  }
}

export const memberPersistenceService = new MemberPersistenceService();
