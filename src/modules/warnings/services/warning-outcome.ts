import { STAFF_WARNING_FIRE_LEVEL } from "../types/enums.ts";

export const WarningOutcome = {
  /** Below warn 3 — the warn role moves, nothing else happens. */
  NONE: "NONE",
  /** Warn 3 — drop one rung and clear the real warnings. */
  DEMOTE: "DEMOTE",
  /** Warn 3 at level 0 — no rung left, so remove from staff. Never blacklists. */
  FIRE: "FIRE",
} as const;
export type WarningOutcome = (typeof WarningOutcome)[keyof typeof WarningOutcome];

/**
 * What reaching a given real-warning level costs. Pure so the rule can be read
 * and tested on its own: warnings **demote**, they do not blacklist, and the only
 * removal is the one case where there is nothing left to demote to.
 */
export function decideWarningOutcome(level: number, staffRoleLevel: number): WarningOutcome {
  if (level < STAFF_WARNING_FIRE_LEVEL) return WarningOutcome.NONE;
  return staffRoleLevel <= 0 ? WarningOutcome.FIRE : WarningOutcome.DEMOTE;
}
