import { PermissionFlagsBits, type Guild, type GuildMember } from "discord.js";
import type { GuildId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { PunishmentType } from "../types/enums.ts";

export function requiredBotPermission(type: PunishmentType): bigint | null {
  switch (type) {
    case PunishmentType.TIMEOUT:
      return PermissionFlagsBits.ModerateMembers;
    case PunishmentType.MUTE:
    case PunishmentType.JAIL:
      return PermissionFlagsBits.ManageRoles;
    case PunishmentType.KICK:
      return PermissionFlagsBits.KickMembers;
    case PunishmentType.BAN:
      return PermissionFlagsBits.BanMembers;
    default:
      return null;
  }
}

export function botHasPermission(guild: Guild, perm: bigint): boolean {
  return guild.members.me?.permissions.has(perm) ?? false;
}

export function botOutranks(guild: Guild, target: GuildMember): boolean {
  const me = guild.members.me;
  if (!me) return false;
  if (guild.ownerId === target.id) return false;
  return me.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

export async function configuredRoleId(
  guildId: GuildId,
  type: RoleConfigType,
): Promise<string | null> {
  const row = await roleConfigService.getByType(guildId, type);
  return row?.roleId ?? null;
}
