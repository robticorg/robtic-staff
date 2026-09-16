import type { GuildMember } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import {
  accessRolesFromRoleIds,
  getHierarchy,
  highestLevelFromRoleIds,
} from "../../configuration/utils/staff-levels.ts";
import { staffPermissionService } from "./staff-permissions.service.ts";
import { staffAcceptedRoleService } from "./staff-accepted-role.service.ts";
import { staffRoleAssignmentService } from "./staff-role-assignment.service.ts";
import { staffTypeService } from "./staff-type.service.ts";

const log = logger.child("staff:snapshot");

/**
 * The exact Staff-related roles a member held at a point in time. Used by every
 * temporary-removal flow so restoration logic is written once.
 */
export interface StaffRoleSnapshot {
  /** Numbered ladder rungs plus the general Staff marker. */
  staffRoleIds: RoleId[];
  /** Access Roles — Staff-related, no hierarchy level. */
  accessRoleIds: RoleId[];
  /**
   * The Accepted Staff Role, if the member held it. Kept apart because its
   * restoration is conditional on current eligibility, not just on presence.
   */
  acceptedRoleIds: RoleId[];
  /**
   * Level-driven assignment roles held before the break. Like the Accepted
   * Role, these are re-validated against the current configuration on restore.
   */
  assignedRoleIds: RoleId[];
  /**
   * The Staff Type role (MAX / DEV / …) held before the break. Restored as-is
   * on return — a type is chosen at acceptance, never re-derived from a level.
   */
  typeRoleIds: RoleId[];
  currentRoleLevel: number | null;
  createdAt: Date;
}

export function emptySnapshot(): StaffRoleSnapshot {
  return {
    staffRoleIds: [],
    accessRoleIds: [],
    acceptedRoleIds: [],
    assignedRoleIds: [],
    typeRoleIds: [],
    currentRoleLevel: null,
    createdAt: new Date(),
  };
}

/** Every role id in the snapshot. */
export function snapshotRoleIds(snapshot: StaffRoleSnapshot): RoleId[] {
  return [
    ...new Set([
      ...snapshot.staffRoleIds,
      ...snapshot.accessRoleIds,
      ...snapshot.acceptedRoleIds,
      ...snapshot.assignedRoleIds,
      ...snapshot.typeRoleIds,
    ]),
  ];
}

/**
 * Captures what the member holds right now. Access Roles are recorded
 * separately and never contribute to `currentRoleLevel`.
 */
export async function captureStaffRoleSnapshot(
  member: GuildMember,
  guildId: GuildId = member.guild.id,
): Promise<StaffRoleSnapshot> {
  const [staffIds, hierarchy, acceptedConfig, managedAssignments, managedTypes] =
    await Promise.all([
      staffPermissionService.staffRoleIds(guildId),
      getHierarchy(guildId),
      staffAcceptedRoleService.getConfig(guildId),
      staffRoleAssignmentService.getManagedRoleIds(guildId),
      staffTypeService.getManagedRoleIds(guildId),
    ]);

  const held = [...member.roles.cache.keys()];
  const acceptedRoleIds =
    acceptedConfig && member.roles.cache.has(acceptedConfig.roleId)
      ? [acceptedConfig.roleId]
      : [];
  const managed = new Set(managedAssignments);
  const typeRoles = new Set(managedTypes);

  return {
    staffRoleIds: held.filter((id) => staffIds.has(id)),
    accessRoleIds: accessRolesFromRoleIds(hierarchy, held),
    acceptedRoleIds,
    assignedRoleIds: held.filter((id) => managed.has(id)),
    typeRoleIds: held.filter((id) => typeRoles.has(id)),
    currentRoleLevel: highestLevelFromRoleIds(hierarchy, held),
    createdAt: new Date(),
  };
}

export interface SnapshotRestoreOutcome {
  restored: RoleId[];
  /** Saved ids whose role no longer exists in this guild. */
  missing: RoleId[];
  /** Exists but sits above the bot, or is integration-managed. */
  blocked: RoleId[];
  failed: boolean;
}

function botCanManage(member: GuildMember, roleId: RoleId): boolean {
  const me = member.guild.members.me;
  const role = member.guild.roles.cache.get(roleId);
  if (!me || !role || role.managed) return false;
  return me.roles.highest.comparePositionTo(role) > 0;
}

/**
 * Restores saved ids, skipping anything unsafe. Roles are resolved against the
 * member's own guild, so an id from elsewhere simply resolves to nothing and is
 * reported as missing rather than applied.
 */
export async function restoreSnapshotRoles(
  member: GuildMember,
  roleIds: readonly RoleId[],
  reason: string,
): Promise<SnapshotRestoreOutcome> {
  const missing: RoleId[] = [];
  const blocked: RoleId[] = [];
  const restorable: RoleId[] = [];

  for (const roleId of new Set(roleIds)) {
    if (!member.guild.roles.cache.has(roleId)) {
      missing.push(roleId);
      continue;
    }
    if (!botCanManage(member, roleId)) {
      blocked.push(roleId);
      continue;
    }
    restorable.push(roleId);
  }

  if (missing.length > 0) {
    log.warn(`restore for ${member.id} in ${member.guild.id}: ${missing.length} role(s) gone`, {
      missing,
    });
  }
  if (blocked.length > 0) {
    log.warn(
      `restore for ${member.id} in ${member.guild.id}: ${blocked.length} role(s) unmanageable`,
      { blocked },
    );
  }

  const toAdd = restorable.filter((id) => !member.roles.cache.has(id));
  if (toAdd.length === 0) return { restored: restorable, missing, blocked, failed: false };

  try {
    await member.roles.add(toAdd, reason);
    return { restored: restorable, missing, blocked, failed: false };
  } catch (err) {
    log.error(`snapshot restore failed for ${member.id} in ${member.guild.id}`, err);
    return { restored: [], missing, blocked, failed: true };
  }
}
