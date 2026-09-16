import type { GuildMember } from "discord.js";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache } from "../../../libs/cache/index.ts";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import {
  onRoleConfigInvalidated,
  roleConfigService,
  type StaffRoleLevel,
} from "../services/role-config.service.ts";
import {
  RoleConfigType,
  STAFF_TIER_BOUNDARIES,
  StaffTier,
  type StaffTier as StaffTierType,
} from "../types/enums.ts";

export function getStaffRoleLevels(guildId: GuildId): Promise<StaffRoleLevel[]> {
  return roleConfigService.getStaffRoleLevels(guildId);
}

export function getStaffLevel(roleId: RoleId, guildId: GuildId): Promise<number | null> {
  return roleConfigService.getStaffLevel(guildId, roleId);
}

export function getHighestStaffLevel(
  member: GuildMember,
  guildId: GuildId,
): Promise<number | null> {
  const roleIds = [...member.roles.cache.keys()];
  return roleConfigService.getHighestStaffLevel(guildId, roleIds);
}

export interface StaffHierarchy {
  guildId: GuildId;

  levels: StaffRoleLevel[];
  levelByRoleId: Map<RoleId, number>;
  ignoredRoleIds: Set<RoleId>;

  accessRoleIds: Set<RoleId>;
  generalStaffRoleId: RoleId | null;
  startLevel: number | null;
  endLevel: number | null;

  boundaryLevels: Record<StaffTierType, number | null>;
  boundaryRoleIds: Record<StaffTierType, RoleId | null>;
}

export const HierarchyProblem = {
  START_NOT_CONFIGURED: "START_NOT_CONFIGURED",
  END_NOT_CONFIGURED: "END_NOT_CONFIGURED",
  STAFF_ROLE_NOT_CONFIGURED: "STAFF_ROLE_NOT_CONFIGURED",
  BOUNDARY_NOT_ON_LADDER: "BOUNDARY_NOT_ON_LADDER",
  BOUNDARY_OUT_OF_ORDER: "BOUNDARY_OUT_OF_ORDER",
} as const;
export type HierarchyProblem = (typeof HierarchyProblem)[keyof typeof HierarchyProblem];

export interface HierarchyIssue {
  problem: HierarchyProblem;
  tier?: StaffTierType;
  roleId?: RoleId;
}

const hierarchyCache = new TtlCache<StaffHierarchy>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

onRoleConfigInvalidated((guildId) => hierarchyCache.delete(guildId));

export function invalidateStaffHierarchy(guildId: GuildId): void {
  hierarchyCache.delete(guildId);
}

async function loadHierarchy(guildId: GuildId): Promise<StaffHierarchy> {
  const [
    levels,
    ignoredRoleIds,
    accessRoleIds,
    generalStaffRoleId,
    boundaryRoles,
    startRow,
    endRow,
  ] = await Promise.all([
    roleConfigService.getStaffRoleLevels(guildId),
    roleConfigService.getIgnoredRoleIds(guildId),
    roleConfigService.getAccessRoleIds(guildId),
    roleConfigService.getGeneralStaffRoleId(guildId),
    roleConfigService.getBoundaryRoles(guildId),
    roleConfigService.getByType(guildId, RoleConfigType.START),
    roleConfigService.getByType(guildId, RoleConfigType.END),
  ]);

  const levelByRoleId = new Map<RoleId, number>();
  for (const rung of levels) levelByRoleId.set(rung.roleId, rung.level);

  const boundaryLevels = {} as Record<StaffTierType, number | null>;
  const boundaryRoleIds = {} as Record<StaffTierType, RoleId | null>;
  for (const tier of [StaffTier.STAFF, ...STAFF_TIER_BOUNDARIES]) {
    boundaryLevels[tier] = null;
    boundaryRoleIds[tier] = null;
  }
  for (const tier of STAFF_TIER_BOUNDARIES) {
    const row = boundaryRoles[tier];
    if (!row) continue;
    boundaryRoleIds[tier] = row.roleId;
    boundaryLevels[tier] = levelByRoleId.get(row.roleId) ?? null;
  }

  const startLevel = startRow ? (levelByRoleId.get(startRow.roleId) ?? null) : null;
  boundaryLevels[StaffTier.STAFF] = startLevel;
  boundaryRoleIds[StaffTier.STAFF] = startRow?.roleId ?? null;

  return {
    guildId,
    levels,
    levelByRoleId,
    ignoredRoleIds: new Set(ignoredRoleIds),
    accessRoleIds: new Set(accessRoleIds),
    generalStaffRoleId,
    startLevel,
    endLevel: endRow ? (levelByRoleId.get(endRow.roleId) ?? null) : null,
    boundaryLevels,
    boundaryRoleIds,
  };
}

export async function getHierarchy(guildId: GuildId): Promise<StaffHierarchy> {
  if (!CACHE_ENABLED) return loadHierarchy(guildId);
  return hierarchyCache.getOrSet(guildId, () => loadHierarchy(guildId));
}

export function validateHierarchy(hierarchy: StaffHierarchy): HierarchyIssue[] {
  const issues: HierarchyIssue[] = [];

  if (hierarchy.startLevel === null) {
    issues.push({ problem: HierarchyProblem.START_NOT_CONFIGURED });
  }
  if (hierarchy.endLevel === null) {
    issues.push({ problem: HierarchyProblem.END_NOT_CONFIGURED });
  }

  let previous = hierarchy.startLevel ?? -1;
  for (const tier of STAFF_TIER_BOUNDARIES) {
    const roleId = hierarchy.boundaryRoleIds[tier];
    if (!roleId) continue;

    const level = hierarchy.boundaryLevels[tier];
    if (level === null) {
      issues.push({ problem: HierarchyProblem.BOUNDARY_NOT_ON_LADDER, tier, roleId });
      continue;
    }
    if (level <= previous) {
      issues.push({ problem: HierarchyProblem.BOUNDARY_OUT_OF_ORDER, tier, roleId });
      continue;
    }
    previous = level;
  }

  return issues;
}

export function getTierForLevel(hierarchy: StaffHierarchy, level: number): StaffTierType {
  for (let i = STAFF_TIER_BOUNDARIES.length - 1; i >= 0; i -= 1) {
    const tier = STAFF_TIER_BOUNDARIES[i] as StaffTierType;
    const boundary = hierarchy.boundaryLevels[tier];
    if (boundary !== null && level >= boundary) return tier;
  }
  return StaffTier.STAFF;
}

export const RoleKind = {
  NUMBERED: "NUMBERED",
  IGNORED: "IGNORED",
  OUTSIDE: "OUTSIDE",
} as const;
export type RoleKind = (typeof RoleKind)[keyof typeof RoleKind];

export interface RoleTierInfo {
  kind: RoleKind;
  level: number | null;
  tier: StaffTierType | null;

  opensTier: StaffTierType | null;
  isStart: boolean;
  isEnd: boolean;
}

export function getTierForRole(hierarchy: StaffHierarchy, roleId: RoleId): RoleTierInfo {
  if (hierarchy.ignoredRoleIds.has(roleId)) {
    return {
      kind: RoleKind.IGNORED,
      level: null,
      tier: null,
      opensTier: null,
      isStart: false,
      isEnd: false,
    };
  }

  const level = hierarchy.levelByRoleId.get(roleId);
  if (level === undefined) {
    return {
      kind: RoleKind.OUTSIDE,
      level: null,
      tier: null,
      opensTier: null,
      isStart: false,
      isEnd: false,
    };
  }

  let opensTier: StaffTierType | null = null;
  for (const tier of [StaffTier.STAFF, ...STAFF_TIER_BOUNDARIES]) {
    if (hierarchy.boundaryRoleIds[tier] === roleId) opensTier = tier;
  }

  return {
    kind: RoleKind.NUMBERED,
    level,
    tier: getTierForLevel(hierarchy, level),
    opensTier,
    isStart: level === hierarchy.startLevel,
    isEnd: level === hierarchy.endLevel,
  };
}

export function highestLevelFromRoleIds(
  hierarchy: StaffHierarchy,
  roleIds: Iterable<RoleId>,
): number | null {
  let highest: number | null = null;
  for (const roleId of roleIds) {
    if (hierarchy.ignoredRoleIds.has(roleId)) continue;
    const level = hierarchy.levelByRoleId.get(roleId);
    if (level === undefined) continue;
    if (highest === null || level > highest) highest = level;
  }
  return highest;
}

export function getNumberedStaffRoles(guildId: GuildId): Promise<StaffRoleLevel[]> {
  return getHierarchy(guildId).then((h) => h.levels.map((r) => ({ ...r })));
}

export async function getLevelForTier(
  guildId: GuildId,
  tier: StaffTierType,
): Promise<number | null> {
  return (await getHierarchy(guildId)).boundaryLevels[tier] ?? null;
}

export function getRoleForLevel(hierarchy: StaffHierarchy, level: number): RoleId | null {
  for (const rung of hierarchy.levels) if (rung.level === level) return rung.roleId;
  return null;
}

export async function getAccessRoles(guildId: GuildId): Promise<RoleId[]> {
  return [...(await getHierarchy(guildId)).accessRoleIds];
}

export async function isAccessRole(roleId: RoleId, guildId: GuildId): Promise<boolean> {
  return (await getHierarchy(guildId)).accessRoleIds.has(roleId);
}

export async function isStaffRelatedRole(roleId: RoleId, guildId: GuildId): Promise<boolean> {
  const hierarchy = await getHierarchy(guildId);
  return (
    hierarchy.levelByRoleId.has(roleId) ||
    hierarchy.accessRoleIds.has(roleId) ||
    hierarchy.generalStaffRoleId === roleId
  );
}

export function accessRolesFromRoleIds(
  hierarchy: StaffHierarchy,
  roleIds: Iterable<RoleId>,
): RoleId[] {
  const out: RoleId[] = [];
  for (const roleId of roleIds) if (hierarchy.accessRoleIds.has(roleId)) out.push(roleId);
  return out;
}

export const staffHierarchyService = {
  getStaffRoleLevels,
  getStaffLevel,
  getHighestStaffLevel,
  getHierarchy,
  invalidate: invalidateStaffHierarchy,
  validateHierarchy,
  getTierForLevel,
  getTierForRole,
  getLevelForTier,
  highestLevelFromRoleIds,
  getAccessRoles,
  isAccessRole,
  isStaffRelatedRole,
  accessRolesFromRoleIds,
  getNumberedStaffRoles,
  getRoleForLevel,
};
