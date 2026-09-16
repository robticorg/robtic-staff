import type { GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { getHierarchy } from "../../configuration/utils/staff-levels.ts";
import { staffAcceptedRoleService } from "./staff-accepted-role.service.ts";
import { staffRoleAssignmentService } from "./staff-role-assignment.service.ts";

const log = logger.child("staff:role-sync");

export interface StaffRolePlan {
  /** Roles a member at this level must hold. */
  add: RoleId[];
  /** Staff-managed roles they must not hold at this level. */
  remove: RoleId[];
}

export interface SyncOptions {
  /** Also strip the blacklist role (used when accepting someone back). */
  clearBlacklist?: boolean;
}

export interface SyncResult {
  added: RoleId[];
  removed: RoleId[];
}

/**
 * The single place that turns "this member is at level N" into a concrete set
 * of Staff-managed roles.
 *
 * Covers the numbered ladder, the Staff marker, level-driven assignments and
 * the Accepted Role. Access Roles are deliberately untouched — they are granted
 * by hand and carry no level rule, so nothing here can add or revoke them.
 *
 * Roles this system does not manage are never named, so unrelated Discord roles
 * always survive.
 */
export async function planStaffRoles(
  guildId: GuildId,
  targetLevel: number,
  options: SyncOptions = {},
): Promise<StaffRolePlan> {
  const hierarchy = await getHierarchy(guildId);

  const add: RoleId[] = [];
  const remove: RoleId[] = [];

  // 1. Numbered ladder — everything up to and including the target level.
  for (const rung of hierarchy.levels) {
    if (rung.level <= targetLevel) add.push(rung.roleId);
    else remove.push(rung.roleId);
  }

  // 2. Staff marker.
  if (hierarchy.generalStaffRoleId) add.push(hierarchy.generalStaffRoleId);

  // 3. Level-driven assignments.
  const assignments = await staffRoleAssignmentService.resolveForLevel(guildId, targetLevel);
  add.push(...assignments.add);
  remove.push(...assignments.remove);

  // 4. Accepted Role.
  const accepted = await staffAcceptedRoleService.getConfig(guildId);
  if (accepted) {
    if (staffAcceptedRoleService.isLevelInRange(accepted, targetLevel)) add.push(accepted.roleId);
    else remove.push(accepted.roleId);
  }

  if (options.clearBlacklist) {
    const blacklist = await roleConfigService.getByType(guildId, RoleConfigType.BLACKLIST);
    if (blacklist) remove.push(blacklist.roleId);
  }

  const addSet = new Set(add);
  return { add: [...addSet], remove: [...new Set(remove)].filter((id) => !addSet.has(id)) };
}

/**
 * Applies the plan. Used after accept, promote, demote and return from break so
 * the derived-role logic exists exactly once.
 */
export async function syncStaffRoles(
  member: GuildMember,
  targetLevel: number,
  reason: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const plan = await planStaffRoles(member.guild.id, targetLevel, options);
  const guildRoles = member.guild.roles.cache;

  const toAdd = plan.add.filter((id) => guildRoles.has(id) && !member.roles.cache.has(id));
  const toRemove = plan.remove.filter((id) => guildRoles.has(id) && member.roles.cache.has(id));

  if (toAdd.length > 0) {
    await member.roles.add(toAdd, reason).catch((err) => log.warn("staff role add failed", err));
  }
  if (toRemove.length > 0) {
    await member.roles
      .remove(toRemove, reason)
      .catch((err) => log.warn("staff role remove failed", err));
  }

  return { added: toAdd, removed: toRemove };
}

export const staffRoleSyncService = { planStaffRoles, syncStaffRoles };
