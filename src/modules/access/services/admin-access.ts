import { PermissionFlagsBits } from "discord.js";
import { accessConfig } from "../../../config/access.ts";

export interface AccessSubject {
  id: string;
  permissions?: { has(flag: bigint): boolean } | string | null;
}

export function isBotOwner(userId: string | null | undefined): boolean {
  return !!userId && userId === accessConfig.botOwnerId;
}

export function hasAdminAccess(subject: AccessSubject | null | undefined): boolean {
  if (!subject) return false;
  if (isBotOwner(subject.id)) return true;
  const perms = subject.permissions;
  return !!perms && typeof perms !== "string" && perms.has(PermissionFlagsBits.Administrator);
}
