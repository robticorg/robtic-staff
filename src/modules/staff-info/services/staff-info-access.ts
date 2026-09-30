import { PermissionFlagsBits } from "discord.js";

export interface AccessMemberLike {
  permissions: { has(flag: bigint): boolean };
  roles: { cache: { has(roleId: string): boolean } };
}

/** An info with no access role is open to everyone; administrators can open every info. */
export function canOpenInfo(
  member: AccessMemberLike,
  info: { accessRoleId?: string | null },
): boolean {
  if (!info.accessRoleId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.has(info.accessRoleId);
}
