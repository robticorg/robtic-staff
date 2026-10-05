import { internalApiLimits } from "../../data/internal-api/config.ts";
import { isSnowflake } from "../../libs/validation/index.ts";
import { logger } from "../../shared/utils/logger.ts";
import {
  RoleKind,
  getHierarchy,
  getTierForRole,
  type StaffHierarchy,
} from "../configuration/utils/staff-levels.ts";
import type { ApiResponse } from "./points.handler.ts";
import { STAFF_TYPE_NAMES } from "./staff-check.handler.ts";

const log = logger.child("internal-api:role-check");

export interface RoleCheckInput {
  guildId?: unknown;
  roleId?: unknown;
  roleIds?: unknown;
}

export interface RoleCheckResult {
  roleId: string;
  isStaffRole: boolean;
  order: number | null;
  level: number | null;
  type: string | null;
}

export interface RoleCheckDeps {
  hierarchy(guildId: string): Promise<StaffHierarchy>;
}

const defaultDeps: RoleCheckDeps = { hierarchy: getHierarchy };

function idProblem(name: string, value: unknown): string | null {
  if (typeof value === "number") return `${name} must be sent as a string, e.g. "${name}": "1234567890"`;
  if (typeof value !== "string" || !isSnowflake(value.trim())) return `${name} must be a Discord id (string)`;
  return null;
}

type Parsed = { ok: true; guildId: string; roleIds: string[]; batch: boolean } | { ok: false; error: string };

export function parseRoleCheck(input: RoleCheckInput): Parsed {
  const guildProblem = idProblem("guildId", input.guildId);
  if (guildProblem) return { ok: false, error: guildProblem };
  const guildId = String(input.guildId).trim();

  if (input.roleIds === undefined || input.roleIds === null) {
    const roleProblem = idProblem("roleId", input.roleId);
    if (roleProblem) return { ok: false, error: `${roleProblem} (or send "roleIds": [ ... ])` };
    return { ok: true, guildId, roleIds: [String(input.roleId).trim()], batch: false };
  }
  if (!Array.isArray(input.roleIds) || input.roleIds.length === 0) {
    return { ok: false, error: "roleIds must be a non-empty array of Discord ids (strings)" };
  }
  if (input.roleIds.length > internalApiLimits.maxStaffCheckIds) {
    return { ok: false, error: `roleIds can hold at most ${internalApiLimits.maxStaffCheckIds} ids` };
  }
  for (const [i, value] of input.roleIds.entries()) {
    const problem = idProblem(`roleIds[${i}]`, value);
    if (problem) return { ok: false, error: problem };
  }
  return { ok: true, guildId, roleIds: [...new Set(input.roleIds.map((v) => String(v).trim()))], batch: true };
}

export function classifyRole(hierarchy: StaffHierarchy, roleId: string): RoleCheckResult {
  const info = getTierForRole(hierarchy, roleId);
  if (info.kind !== RoleKind.NUMBERED || info.level === null) {
    return { roleId, isStaffRole: false, order: null, level: null, type: null };
  }
  const bottom = hierarchy.startLevel ?? Math.min(...hierarchy.levels.map((rung) => rung.level));
  return {
    roleId,
    isStaffRole: true,
    order: info.level - bottom + 1,
    level: info.level,
    type: info.tier ? STAFF_TYPE_NAMES[info.tier] : null,
  };
}

export async function handleRoleCheck(input: RoleCheckInput, deps: RoleCheckDeps = defaultDeps): Promise<ApiResponse> {
  const parsed = parseRoleCheck(input);
  if (!parsed.ok) return { status: 400, body: { success: false, error: parsed.error } };

  try {
    const hierarchy = await deps.hierarchy(parsed.guildId);
    const results = parsed.roleIds.map((roleId) => classifyRole(hierarchy, roleId));
    const totalStaffRoles = hierarchy.levels.length;

    if (!parsed.batch) return { status: 200, body: { success: true, ...results[0], totalStaffRoles } };
    return {
      status: 200,
      body: {
        success: true,
        count: results.length,
        staffRoleCount: results.filter((r) => r.isStaffRole).length,
        totalStaffRoles,
        results,
      },
    };
  } catch (err) {
    log.error("role check failed", err);
    return { status: 500, body: { success: false, error: "internal error" } };
  }
}
