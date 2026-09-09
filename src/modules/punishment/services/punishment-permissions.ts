import { PermissionFlagsBits, type Guild, type GuildMember } from "discord.js";
import type { GuildId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { PunishmentType } from "../types/enums.ts";

export interface ApprovalDecisionInput {
  type: "KICK" | "BAN";
  isAdministrator: boolean;
  hasChatManagerRole: boolean;
}

export function decideApprovalAuthorization(input: ApprovalDecisionInput): boolean {
  if (input.type === "BAN") return input.isAdministrator;
  return input.isAdministrator || input.hasChatManagerRole;
}

export interface SelfApprovalInput {
  requestedBy: string;
  deciderId: string;
}

export function isSelfApproval(input: SelfApprovalInput): boolean {
  return input.requestedBy === input.deciderId;
}

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

export async function memberHasChatManagerRole(member: GuildMember): Promise<boolean> {
  const role = await roleConfigService.getByType(member.guild.id, RoleConfigType.CHAT_MANAGER);
  return role ? member.roles.cache.has(role.roleId) : false;
}

export async function canDecideApproval(
  member: GuildMember,
  type: "KICK" | "BAN",
): Promise<boolean> {
  return decideApprovalAuthorization({
    type,
    isAdministrator: member.permissions.has(PermissionFlagsBits.Administrator),
    hasChatManagerRole: type === "KICK" ? await memberHasChatManagerRole(member) : false,
  });
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
