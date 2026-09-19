import type { GuildMember } from "discord.js";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";

export const JailDenyReason = {
  /** Jail is a member punishment — staff discipline goes through warnings. */
  TARGET_IS_STAFF: "TARGET_IS_STAFF",
  /** Classic moderation hierarchy: you cannot act on someone above you. */
  TARGET_OUTRANKS_ACTOR: "TARGET_OUTRANKS_ACTOR",
} as const;
export type JailDenyReason = (typeof JailDenyReason)[keyof typeof JailDenyReason];

export type JailDecision = { allowed: true } | { allowed: false; reason: JailDenyReason };

export interface JailAuthorizationInput {
  actorIsAdministrator: boolean;
  targetIsStaff: boolean;
  /** Actor's highest Discord role sits strictly above the target's. */
  actorOutranksTarget: boolean;
}

/**
 * Who may jail whom. Pure, so the policy can be read in one place:
 *
 *  - an Administrator may jail anyone, as everywhere else in this codebase;
 *  - nobody else may jail a **staff member** at all;
 *  - and nobody else may jail someone whose top Discord role sits at or above
 *    their own.
 *
 * Role *position* is the yardstick rather than the staff ladder, because the
 * second rule has to cover high-ranking members who are not staff.
 */
export function decideJailAuthorization(input: JailAuthorizationInput): JailDecision {
  if (input.actorIsAdministrator) return { allowed: true };
  if (input.targetIsStaff) {
    return { allowed: false, reason: JailDenyReason.TARGET_IS_STAFF };
  }
  if (!input.actorOutranksTarget) {
    return { allowed: false, reason: JailDenyReason.TARGET_OUTRANKS_ACTOR };
  }
  return { allowed: true };
}

/** Resolves the live inputs — never trusts a cached level or a stale member. */
export async function canJail(actor: GuildMember, target: GuildMember): Promise<JailDecision> {
  return decideJailAuthorization({
    actorIsAdministrator: staffPermissionService.isAdministrator(actor),
    targetIsStaff: await staffPermissionService.isStaff(target),
    actorOutranksTarget: actor.roles.highest.comparePositionTo(target.roles.highest) > 0,
  });
}
