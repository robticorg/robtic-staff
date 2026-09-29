import { resolveTierKeyword } from "../../../data/staff-tiers/index.ts";
import type { StaffTier } from "../../../modules/configuration/types/enums.ts";
import { MAX_LEVEL_KEYWORDS } from "../../../modules/staff/services/staff-accept-args.ts";

const SNOWFLAKE_MIN_DIGITS = 17;

export interface ParsedMoveArgs {
  /** Number of levels to move; null = the default of one. */
  amount: number | null;
  /** Move straight to the start of this tier (high / owner / ship). */
  tier: StaffTier | null;
  /** "max" / "ماكس" — straight to the END role. */
  max: boolean;
  /** A token that is neither a count nor a tier. */
  unknown: string | null;
}

/**
 * `!promote @user`, `!promote @user 2`, `!promote @user owner`.
 * Mentions and raw user ids (17+ digits) are skipped so an id is never read as a count.
 */
export function parseMoveArgs(args: readonly string[]): ParsedMoveArgs {
  let amount: number | null = null;
  let tier: StaffTier | null = null;
  let max = false;
  const chosen = () => amount !== null || tier !== null || max;

  for (const raw of args) {
    const token = raw.trim();
    if (!token || /^<@!?\d+>$/.test(token)) continue;

    if (/^\d+$/.test(token)) {
      if (token.length >= SNOWFLAKE_MIN_DIGITS) continue;
      if (chosen()) return { amount, tier, max, unknown: token };
      amount = Number.parseInt(token, 10);
      continue;
    }

    if (MAX_LEVEL_KEYWORDS.has(token.toLowerCase()) && !chosen()) {
      max = true;
      continue;
    }

    const resolved = resolveTierKeyword(token);
    if (resolved && !chosen()) {
      tier = resolved;
      continue;
    }
    return { amount, tier, max, unknown: token };
  }
  return { amount, tier, max, unknown: null };
}
