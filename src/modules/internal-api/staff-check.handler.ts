import { internalApiLimits } from "../../data/internal-api/config.ts";
import { isSnowflake } from "../../libs/validation/index.ts";
import { logger } from "../../shared/utils/logger.ts";
import { StaffTier } from "../configuration/types/enums.ts";
import { getHierarchy, getTierForLevel } from "../configuration/utils/staff-levels.ts";
import { StaffModel } from "../staff/models/staff.model.ts";
import { StaffStatus } from "../staff/types/enums.ts";
import type { ApiResponse } from "./points.handler.ts";

const log = logger.child("internal-api:staff-check");

const CURRENT_STAFF_STATUSES: readonly string[] = [StaffStatus.ACTIVE, StaffStatus.BREAK];

export const STAFF_TYPE_NAMES: Readonly<Record<StaffTier, string>> = {
  [StaffTier.STAFF]: "staff",
  [StaffTier.HIGHSTAFF]: "high",
  [StaffTier.OWNER]: "owner",
  [StaffTier.SHIP]: "ship",
};

export interface StaffCheckRecord {
  userId: string;
  status?: string;
  currentRoleLevel: number;
}

export interface StaffCheckDeps {
  findStaff(guildId: string, userIds: readonly string[]): Promise<StaffCheckRecord[]>;
  tierResolver(guildId: string): Promise<(level: number) => StaffTier>;
}

const defaultDeps: StaffCheckDeps = {
  findStaff: (guildId, userIds) =>
    StaffModel.find({ guildId, userId: { $in: userIds } }, { userId: 1, status: 1, currentRoleLevel: 1 })
      .lean<StaffCheckRecord[]>()
      .exec(),
  tierResolver: async (guildId) => {
    const hierarchy = await getHierarchy(guildId);
    return (level) => getTierForLevel(hierarchy, level);
  },
};

export interface StaffCheckInput {
  guildId?: unknown;
  userId?: unknown;
  userIds?: unknown;
}

export interface StaffCheckResult {
  userId: string;
  isStaff: boolean;
  type: string | null;
  onBreak?: boolean;
}

type Parsed = { ok: true; guildId: string; userIds: string[]; batch: boolean } | { ok: false; error: string };

function idProblem(name: string, value: unknown): string | null {
  if (typeof value === "number") return `${name} must be sent as a string, e.g. "${name}": "1234567890"`;
  if (typeof value !== "string" || !isSnowflake(value.trim())) return `${name} must be a Discord id (string)`;
  return null;
}

export function parseStaffCheck(input: StaffCheckInput): Parsed {
  const guildProblem = idProblem("guildId", input.guildId);
  if (guildProblem) return { ok: false, error: guildProblem };
  const guildId = String(input.guildId).trim();

  if (input.userIds === undefined || input.userIds === null) {
    const userProblem = idProblem("userId", input.userId);
    if (userProblem) return { ok: false, error: `${userProblem} (or send "userIds": [ ... ])` };
    return { ok: true, guildId, userIds: [String(input.userId).trim()], batch: false };
  }

  if (!Array.isArray(input.userIds) || input.userIds.length === 0) {
    return { ok: false, error: "userIds must be a non-empty array of Discord ids (strings)" };
  }
  if (input.userIds.length > internalApiLimits.maxStaffCheckIds) {
    return { ok: false, error: `userIds can hold at most ${internalApiLimits.maxStaffCheckIds} ids` };
  }
  for (const [i, value] of input.userIds.entries()) {
    const problem = idProblem(`userIds[${i}]`, value);
    if (problem) return { ok: false, error: problem };
  }
  const userIds = [...new Set(input.userIds.map((v) => String(v).trim()))];
  return { ok: true, guildId, userIds, batch: true };
}

export async function handleStaffCheck(input: StaffCheckInput, deps: StaffCheckDeps = defaultDeps): Promise<ApiResponse> {
  const parsed = parseStaffCheck(input);
  if (!parsed.ok) return { status: 400, body: { success: false, error: parsed.error } };

  try {
    const [records, tierFor] = await Promise.all([
      deps.findStaff(parsed.guildId, parsed.userIds),
      deps.tierResolver(parsed.guildId),
    ]);
    const byUser = new Map(records.map((r) => [r.userId, r]));
    const results: StaffCheckResult[] = parsed.userIds.map((userId) => {
      const staff = byUser.get(userId);
      if (!staff || (staff.status && !CURRENT_STAFF_STATUSES.includes(staff.status))) {
        return { userId, isStaff: false, type: null };
      }
      return {
        userId,
        isStaff: true,
        type: STAFF_TYPE_NAMES[tierFor(staff.currentRoleLevel)],
        onBreak: staff.status === StaffStatus.BREAK,
      };
    });

    if (!parsed.batch) return { status: 200, body: { success: true, ...results[0] } };
    return {
      status: 200,
      body: { success: true, count: results.length, staffCount: results.filter((r) => r.isStaff).length, results },
    };
  } catch (err) {
    log.error("staff check failed", err);
    return { status: 500, body: { success: false, error: "internal error" } };
  }
}
