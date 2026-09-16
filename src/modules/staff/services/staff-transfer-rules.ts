import type { RoleId } from "../../../shared/types/index.ts";
import { StaffStatus } from "../types/enums.ts";

/**
 * Every reason a transfer is refused. Kept as data so the decision is a pure
 * function: no Discord, no MongoDB, no message strings.
 */
export const TransferProblem = {
  /** Raised by the authorization service, never by `validateTransfer`. */
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  SAME_MEMBER: "SAME_MEMBER",
  TARGET_IS_BOT: "TARGET_IS_BOT",

  SOURCE_NOT_STAFF: "SOURCE_NOT_STAFF",
  SOURCE_FIRED: "SOURCE_FIRED",
  SOURCE_BLACKLISTED: "SOURCE_BLACKLISTED",
  SOURCE_ON_BREAK: "SOURCE_ON_BREAK",
  SOURCE_TRANSFERRED: "SOURCE_TRANSFERRED",
  SOURCE_HAS_ACTIVE_CASES: "SOURCE_HAS_ACTIVE_CASES",

  TARGET_ALREADY_STAFF: "TARGET_ALREADY_STAFF",
  TARGET_BLACKLISTED: "TARGET_BLACKLISTED",

  HIERARCHY_INVALID: "HIERARCHY_INVALID",
  LADDER_NOT_CONFIGURED: "LADDER_NOT_CONFIGURED",
  LEVEL_UNKNOWN: "LEVEL_UNKNOWN",
} as const;
export type TransferProblem = (typeof TransferProblem)[keyof typeof TransferProblem];

export interface TransferStateInput {
  sourceId: string;
  targetId: string;
  targetIsBot: boolean;

  /** null when there is no Staff record at all for the source. */
  sourceStatus: StaffStatus | null;
  sourceHoldsBlacklistRole: boolean;
  sourceHasOpenVacation: boolean;
  sourceActiveCases: number;

  /** null when the target has never been Staff. */
  targetStatus: StaffStatus | null;
  targetHoldsBlacklistRole: boolean;

  hierarchyValid: boolean;
  ladderConfigured: boolean;
  /** Resolved Staff level of the source, or null when it cannot be determined. */
  sourceLevel: number | null;
}

/**
 * Ordered on purpose: identity first, then the source, then the target, then
 * the configuration. The first failure wins so the manager is told the one
 * thing they have to fix, and nothing is ever half-checked.
 */
export function validateTransfer(input: TransferStateInput): TransferProblem | null {
  if (input.sourceId === input.targetId) return TransferProblem.SAME_MEMBER;
  if (input.targetIsBot) return TransferProblem.TARGET_IS_BOT;

  // ── Source must be a real, currently active Staff member ──────────────────
  if (input.sourceStatus === null) return TransferProblem.SOURCE_NOT_STAFF;
  if (input.sourceStatus === StaffStatus.BLACKLISTED || input.sourceHoldsBlacklistRole) {
    return TransferProblem.SOURCE_BLACKLISTED;
  }
  if (input.sourceStatus === StaffStatus.FIRED) return TransferProblem.SOURCE_FIRED;
  if (input.sourceStatus === StaffStatus.TRANSFERRED) {
    return TransferProblem.SOURCE_TRANSFERRED;
  }
  // The status and the vacation row are checked separately: either one being
  // set means a snapshot exists that must never point at the wrong user.
  if (input.sourceStatus === StaffStatus.BREAK || input.sourceHasOpenVacation) {
    return TransferProblem.SOURCE_ON_BREAK;
  }
  if (input.sourceActiveCases > 0) return TransferProblem.SOURCE_HAS_ACTIVE_CASES;

  // ── Target must not already hold a Staff position ─────────────────────────
  if (input.targetHoldsBlacklistRole || input.targetStatus === StaffStatus.BLACKLISTED) {
    return TransferProblem.TARGET_BLACKLISTED;
  }
  // FIRED and TRANSFERRED records are past identities, not current positions —
  // the record is reused rather than merged, so nothing active is overwritten.
  if (
    input.targetStatus === StaffStatus.ACTIVE ||
    input.targetStatus === StaffStatus.BREAK
  ) {
    return TransferProblem.TARGET_ALREADY_STAFF;
  }

  // ── Configuration must be trustworthy before any level maths ──────────────
  if (!input.ladderConfigured) return TransferProblem.LADDER_NOT_CONFIGURED;
  if (!input.hierarchyValid) return TransferProblem.HIERARCHY_INVALID;
  if (input.sourceLevel === null) return TransferProblem.LEVEL_UNKNOWN;

  return null;
}

export interface RoleSafetyInput {
  /** Roles that exist in the guild right now. */
  existing: ReadonlySet<RoleId>;
  /** Integration/bot-managed roles — never assignable. */
  managed: ReadonlySet<RoleId>;
  /** Roles positioned below the bot's highest role. */
  manageable: ReadonlySet<RoleId>;
  everyoneRoleId: RoleId;
}

export interface RoleSafetyResult {
  safe: RoleId[];
  /** Named so the caller can report exactly what it refused to touch. */
  rejected: RoleId[];
}

/**
 * The gate every role passes before it is written to a member: it must exist in
 * this guild, must not be @everyone, must not be integration-managed, and must
 * sit below the bot. Anything else is dropped rather than attempted.
 */
export function filterAssignableRoles(
  roleIds: Iterable<RoleId>,
  input: RoleSafetyInput,
): RoleSafetyResult {
  const safe: RoleId[] = [];
  const rejected: RoleId[] = [];

  for (const roleId of new Set(roleIds)) {
    if (
      roleId === input.everyoneRoleId ||
      !input.existing.has(roleId) ||
      input.managed.has(roleId) ||
      !input.manageable.has(roleId)
    ) {
      rejected.push(roleId);
      continue;
    }
    safe.push(roleId);
  }

  return { safe, rejected };
}

export interface TransferRoleSets {
  /** Ladder rungs up to the level, the marker, assignments, accepted role. */
  levelDriven: readonly RoleId[];
  /** Only the Access Roles the source actually holds — never all of them. */
  heldAccess: readonly RoleId[];
  /** The one Staff Type role the source holds, if any. */
  typeRole: RoleId | null;
}

/** Everything the target must end up with, de-duplicated and order-stable. */
export function collectTransferableRoles(sets: TransferRoleSets): RoleId[] {
  const out = new Set<RoleId>(sets.levelDriven);
  for (const roleId of sets.heldAccess) out.add(roleId);
  if (sets.typeRole) out.add(sets.typeRole);
  return [...out];
}
