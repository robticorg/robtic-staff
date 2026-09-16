import { RoleConfigType } from "../../modules/configuration/types/enums.ts";

const DAY_MS = 86_400_000;

export const serverTagConfig = {
  restrictionDurationMs: 3 * DAY_MS,

  sweepIntervalMs: 60_000,
  sweepBatchSize: 25,

  auditIntervalMs: 0,

  auditActionDelayMs: 250,
} as const;

export const STAFF_TAG_MANAGED_ROLE_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.START,
  RoleConfigType.END,
  RoleConfigType.STAFF,
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
];

export const STAFF_TAG_PROTECTED_ROLE_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.BLACKLIST,
  RoleConfigType.IGNORE,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.VACATION,
  RoleConfigType.TAG,
];
