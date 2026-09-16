import { staffTypeService } from "../../../modules/staff/services/staff-type.service.ts";
import type { StaffType } from "../../../modules/staff/types/enums.ts";

/**
 * Discord snowflakes are 17–20 digits. A bare target id looks exactly like a
 * level otherwise, so length is what separates `!accept 123456789012345678`
 * from `!accept @user 3`.
 */
const SNOWFLAKE_MIN_DIGITS = 17;

export const AcceptArgProblem = {
  UNKNOWN_TOKEN: "UNKNOWN_TOKEN",
  DUPLICATE_LEVEL: "DUPLICATE_LEVEL",
  DUPLICATE_TYPE: "DUPLICATE_TYPE",
} as const;
export type AcceptArgProblem = (typeof AcceptArgProblem)[keyof typeof AcceptArgProblem];

export interface ParsedAcceptArguments {
  level: number | null;
  staffType: StaffType | null;
  problem?: AcceptArgProblem;
  /** The offending word, when the parse failed. */
  token?: string;
}

function isMentionOf(token: string, targetId: string): boolean {
  return token === `<@${targetId}>` || token === `<@!${targetId}>` || token === targetId;
}

/**
 * Splits `!accept` arguments into a level and a Staff Type.
 *
 * Order-independent by design: a level is always numeric and a type is always a
 * word, so `max 3` and `3 max` cannot be confused. Anything that is neither is
 * rejected rather than ignored, so a typo never silently accepts someone at the
 * wrong level or with no type.
 */
export function parseAcceptArguments(
  args: readonly string[],
  targetId: string,
): ParsedAcceptArguments {
  let level: number | null = null;
  let staffType: StaffType | null = null;
  let targetSeen = false;

  for (const raw of args) {
    const token = raw.trim();
    if (token.length === 0) continue;

    // The target itself appears in the argument list; skip it exactly once so a
    // second bare number is still read as a level.
    if (!targetSeen && isMentionOf(token, targetId)) {
      targetSeen = true;
      continue;
    }
    // Any other user mention is not ours to interpret.
    if (/^<@!?\d+>$/.test(token)) continue;

    if (/^\d+$/.test(token)) {
      if (token.length >= SNOWFLAKE_MIN_DIGITS) continue;
      const parsed = Number.parseInt(token, 10);
      if (!Number.isSafeInteger(parsed)) {
        return { level, staffType, problem: AcceptArgProblem.UNKNOWN_TOKEN, token };
      }
      if (level !== null) {
        return { level, staffType, problem: AcceptArgProblem.DUPLICATE_LEVEL, token };
      }
      level = parsed;
      continue;
    }

    const resolved = staffTypeService.resolveKeyword(token);
    if (!resolved) {
      return { level, staffType, problem: AcceptArgProblem.UNKNOWN_TOKEN, token };
    }
    if (staffType !== null && staffType !== resolved) {
      return { level, staffType, problem: AcceptArgProblem.DUPLICATE_TYPE, token };
    }
    staffType = resolved;
  }

  return { level, staffType };
}
