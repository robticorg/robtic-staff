import { RoleConfigType } from "../../modules/configuration/types/enums.ts";

const DAY_MS = 86_400_000;

export const serverTagConfig = {
  /**
   * How long Staff roles stay stripped after the Server Tag is removed.
   * Every service takes an optional override, so this is the default and not a
   * hard-coded constant at the call sites.
   */
  restrictionDurationMs: 3 * DAY_MS,

  sweepIntervalMs: 60_000,
  sweepBatchSize: 25,

  /**
   * Full-guild reconciliation of the Tag Role. Runs once on every boot, which
   * is what catches drift accumulated while the process was down (a role handed
   * out by hand, a tag toggled with the bot offline). Set a positive interval to
   * also re-run it periodically; 0 means boot-only.
   */
  auditIntervalMs: 0,

  /**
   * Pause between two members the audit actually writes to. Unchanged members
   * cost nothing, so this only throttles real role writes — without it a first
   * run over a large guild would burst straight into Discord's rate limiter.
   */
  auditActionDelayMs: 250,
} as const;

/**
 * Role slots the Server Tag restriction is allowed to strip and later restore.
 * The numbered Staff ladder is added on top of this at runtime (it is stored
 * with a `level`, not a fixed type).
 *
 * STAFF_MANAGER / CHAT_MANAGER / APPEAL_MANAGER / GIFT_MANAGER / APPLY_MANAGER
 * are duty roles that belong to the Staff configuration, so they follow the
 * Staff roles.
 */
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

/**
 * Never captured, never removed, never restored by this system — even if a
 * misconfiguration puts one of them on the Staff ladder. BLACKLIST in
 * particular stays under the Staff system's control (§16).
 */
export const STAFF_TAG_PROTECTED_ROLE_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.BLACKLIST,
  RoleConfigType.IGNORE,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.VACATION,
  RoleConfigType.TAG,
];
