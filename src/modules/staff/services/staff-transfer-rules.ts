import type { RoleId } from "../../../shared/types/index.ts";
import { StaffStatus } from "../types/enums.ts";

export const TransferProblem = {
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

  sourceStatus: StaffStatus | null;
  sourceHoldsBlacklistRole: boolean;
  sourceHasOpenVacation: boolean;
  sourceActiveCases: number;

  targetStatus: StaffStatus | null;
  targetHoldsBlacklistRole: boolean;

  hierarchyValid: boolean;
  ladderConfigured: boolean;

  sourceLevel: number | null;
}

export function validateTransfer(input: TransferStateInput): TransferProblem | null {
  if (input.sourceId === input.targetId) return TransferProblem.SAME_MEMBER;
  if (input.targetIsBot) return TransferProblem.TARGET_IS_BOT;

  if (input.sourceStatus === null) return TransferProblem.SOURCE_NOT_STAFF;
  if (input.sourceStatus === StaffStatus.BLACKLISTED || input.sourceHoldsBlacklistRole) {
    return TransferProblem.SOURCE_BLACKLISTED;
  }
  if (input.sourceStatus === StaffStatus.FIRED) return TransferProblem.SOURCE_FIRED;
  if (input.sourceStatus === StaffStatus.TRANSFERRED) {
    return TransferProblem.SOURCE_TRANSFERRED;
  }

  if (input.sourceStatus === StaffStatus.BREAK || input.sourceHasOpenVacation) {
    return TransferProblem.SOURCE_ON_BREAK;
  }
  if (input.sourceActiveCases > 0) return TransferProblem.SOURCE_HAS_ACTIVE_CASES;

  if (input.targetHoldsBlacklistRole || input.targetStatus === StaffStatus.BLACKLISTED) {
    return TransferProblem.TARGET_BLACKLISTED;
  }

  if (
    input.targetStatus === StaffStatus.ACTIVE ||
    input.targetStatus === StaffStatus.BREAK
  ) {
    return TransferProblem.TARGET_ALREADY_STAFF;
  }

  if (!input.ladderConfigured) return TransferProblem.LADDER_NOT_CONFIGURED;
  if (!input.hierarchyValid) return TransferProblem.HIERARCHY_INVALID;
  if (input.sourceLevel === null) return TransferProblem.LEVEL_UNKNOWN;

  return null;
}

export interface RoleSafetyInput {
  existing: ReadonlySet<RoleId>;

  managed: ReadonlySet<RoleId>;

  manageable: ReadonlySet<RoleId>;
  everyoneRoleId: RoleId;
}

export interface RoleSafetyResult {
  safe: RoleId[];

  rejected: RoleId[];
}

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
  levelDriven: readonly RoleId[];

  heldAccess: readonly RoleId[];

  typeRole: RoleId | null;
}

export function collectTransferableRoles(sets: TransferRoleSets): RoleId[] {
  const out = new Set<RoleId>(sets.levelDriven);
  for (const roleId of sets.heldAccess) out.add(roleId);
  if (sets.typeRole) out.add(sets.typeRole);
  return [...out];
}
