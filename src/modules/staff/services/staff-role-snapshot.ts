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

export interface StaffRoleSnapshot {
  staffRoleIds: RoleId[];

  accessRoleIds: RoleId[];

  acceptedRoleIds: RoleId[];

  assignedRoleIds: RoleId[];

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

  missing: RoleId[];

  blocked: RoleId[];
  failed: boolean;
}

function botCanManage(member: GuildMember, roleId: RoleId): boolean {
  const me = member.guild.members.me;
  const role = member.guild.roles.cache.get(roleId);
  if (!me || !role || role.managed) return false;
  return me.roles.highest.comparePositionTo(role) > 0;
}

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
