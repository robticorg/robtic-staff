import { resolveTierKeyword } from "../../../data/staff-tiers/index.ts";
import type { StaffTier } from "../../../modules/configuration/types/enums.ts";
import { staffTypeService } from "../../../modules/staff/services/staff-type.service.ts";
import type { StaffType } from "../../../modules/staff/types/enums.ts";

const SNOWFLAKE_MIN_DIGITS = 17;

export const AcceptArgProblem = {
  UNKNOWN_TOKEN: "UNKNOWN_TOKEN",
  DUPLICATE_LEVEL: "DUPLICATE_LEVEL",
  DUPLICATE_TYPE: "DUPLICATE_TYPE",
  DUPLICATE_TIER: "DUPLICATE_TIER",

  LEVEL_AND_TIER: "LEVEL_AND_TIER",
} as const;
export type AcceptArgProblem = (typeof AcceptArgProblem)[keyof typeof AcceptArgProblem];

export interface ParsedAcceptArguments {
  level: number | null;
  staffType: StaffType | null;

  tier: StaffTier | null;
  problem?: AcceptArgProblem;

  token?: string;
}

function isMentionOf(token: string, targetId: string): boolean {
  return token === `<@${targetId}>` || token === `<@!${targetId}>` || token === targetId;
}

export function parseAcceptArguments(
  args: readonly string[],
  targetId: string,
): ParsedAcceptArguments {
  let level: number | null = null;
  let staffType: StaffType | null = null;
  let tier: StaffTier | null = null;
  let targetSeen = false;

  const fail = (problem: AcceptArgProblem, token: string): ParsedAcceptArguments => ({
    level,
    staffType,
    tier,
    problem,
    token,
  });

  for (const raw of args) {
    const token = raw.trim();
    if (token.length === 0) continue;

    if (!targetSeen && isMentionOf(token, targetId)) {
      targetSeen = true;
      continue;
    }

    if (/^<@!?\d+>$/.test(token)) continue;

    if (/^\d+$/.test(token)) {
      if (token.length >= SNOWFLAKE_MIN_DIGITS) continue;
      const parsed = Number.parseInt(token, 10);
      if (!Number.isSafeInteger(parsed)) return fail(AcceptArgProblem.UNKNOWN_TOKEN, token);
      if (level !== null) return fail(AcceptArgProblem.DUPLICATE_LEVEL, token);
      if (tier !== null) return fail(AcceptArgProblem.LEVEL_AND_TIER, token);
      level = parsed;
      continue;
    }

    const resolvedType = staffTypeService.resolveKeyword(token);
    if (resolvedType) {
      if (staffType !== null && staffType !== resolvedType) {
        return fail(AcceptArgProblem.DUPLICATE_TYPE, token);
      }
      staffType = resolvedType;
      continue;
    }

    const resolvedTier = resolveTierKeyword(token);
    if (resolvedTier) {
      if (level !== null) return fail(AcceptArgProblem.LEVEL_AND_TIER, token);
      if (tier !== null && tier !== resolvedTier) {
        return fail(AcceptArgProblem.DUPLICATE_TIER, token);
      }
      tier = resolvedTier;
      continue;
    }

    return fail(AcceptArgProblem.UNKNOWN_TOKEN, token);
  }

  return { level, staffType, tier };
}
