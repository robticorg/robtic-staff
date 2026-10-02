import { hasAdminAccess } from "../../access/index.ts";

export interface AccessMemberLike {
  id: string;
  permissions: { has(flag: bigint): boolean };
  roles: { cache: { has(roleId: string): boolean } };
}

/** An info with no access role is open to everyone; administrators can open every info. */
export function canOpenInfo(
  member: AccessMemberLike,
  info: { accessRoleId?: string | null },
): boolean {
  if (!info.accessRoleId) return true;
  if (hasAdminAccess(member)) return true;
  return member.roles.cache.has(info.accessRoleId);
}
