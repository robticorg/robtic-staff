import type { RoleId } from "../../../../shared/types/index.ts";
import { LadderProblem, orderLadderRoles, type LadderRoleLike } from "../../../configuration/utils/ladder-order.ts";
import type { HiddenConfigView } from "../repositories/hidden-staff-config.repository.ts";

export const HiddenConfigProblem = {
  NOT_CONFIGURED: "NOT_CONFIGURED",
  START_MISSING: "START_MISSING",
  END_MISSING: "END_MISSING",
  END_BELOW_START: "END_BELOW_START",
  START_IGNORED: "START_IGNORED",
  END_IGNORED: "END_IGNORED",
  NO_LEVELS: "NO_LEVELS",
} as const;
export type HiddenConfigProblem = (typeof HiddenConfigProblem)[keyof typeof HiddenConfigProblem];

export interface HiddenRoleLike extends LadderRoleLike {
  name?: string;
}

export interface HiddenLevel {
  roleId: RoleId;
  level: number;
  name: string;
}

export interface HiddenHierarchy {
  levels: HiddenLevel[];
  ignoredRoleIds: ReadonlySet<RoleId>;
  startRoleId: RoleId | null;
  endRoleId: RoleId | null;
  problem: HiddenConfigProblem | null;
}

export function buildHiddenHierarchy(input: {
  roles: Iterable<HiddenRoleLike>;
  everyoneRoleId: RoleId;
  config: HiddenConfigView;
  excludedRoleIds: Iterable<RoleId>;
}): HiddenHierarchy {
  const ignored = new Set(input.config.hiddenIgnoredRoleIds);
  const base = {
    levels: [] as HiddenLevel[],
    ignoredRoleIds: ignored,
    startRoleId: input.config.hiddenStartRoleId,
    endRoleId: input.config.hiddenEndRoleId,
  };
  const { hiddenStartRoleId: start, hiddenEndRoleId: end } = input.config;
  if (!start || !end) return { ...base, problem: HiddenConfigProblem.NOT_CONFIGURED };
  if (ignored.has(start)) return { ...base, problem: HiddenConfigProblem.START_IGNORED };
  if (ignored.has(end)) return { ...base, problem: HiddenConfigProblem.END_IGNORED };

  const roles = [...input.roles];
  const ordered = orderLadderRoles({
    roles,
    startRoleId: start,
    endRoleId: end,
    everyoneRoleId: input.everyoneRoleId,
    excludedRoleIds: [...input.excludedRoleIds, ...ignored],
  });
  if (!ordered.ok) {
    const problem =
      ordered.problem === LadderProblem.START_MISSING
        ? HiddenConfigProblem.START_MISSING
        : ordered.problem === LadderProblem.END_MISSING
          ? HiddenConfigProblem.END_MISSING
          : HiddenConfigProblem.END_BELOW_START;
    return { ...base, problem };
  }
  if (ordered.ordered.length === 0) return { ...base, problem: HiddenConfigProblem.NO_LEVELS };

  const names = new Map(roles.map((role) => [role.id, role.name ?? role.id]));
  return {
    ...base,
    levels: ordered.ordered.map((roleId, index) => ({ roleId, level: index + 1, name: names.get(roleId) ?? roleId })),
    problem: null,
  };
}

export function hiddenLevelOfRole(hierarchy: HiddenHierarchy, roleId: RoleId): number | null {
  return hierarchy.levels.find((rung) => rung.roleId === roleId)?.level ?? null;
}

export function highestHiddenLevel(hierarchy: HiddenHierarchy, roleIds: Iterable<RoleId>): number {
  let highest = 0;
  for (const roleId of roleIds) {
    const level = hiddenLevelOfRole(hierarchy, roleId);
    if (level !== null && level > highest) highest = level;
  }
  return highest;
}

export function hiddenRoleForLevel(hierarchy: HiddenHierarchy, level: number): HiddenLevel | null {
  return hierarchy.levels.find((rung) => rung.level === level) ?? null;
}

export function hiddenRolesForLevel(hierarchy: HiddenHierarchy, level: number): RoleId[] {
  return hierarchy.levels.filter((rung) => rung.level <= level).map((rung) => rung.roleId);
}

export function hiddenMaxLevel(hierarchy: HiddenHierarchy): number {
  return hierarchy.levels.length;
}

export function hiddenRolePlan(
  hierarchy: HiddenHierarchy,
  level: number,
): { add: RoleId[]; remove: RoleId[] } {
  return {
    add: hierarchy.levels.filter((rung) => rung.level <= level).map((rung) => rung.roleId),
    remove: hierarchy.levels.filter((rung) => rung.level > level).map((rung) => rung.roleId),
  };
}
