export const RoleConfigType = {
  START: "START",
  END: "END",
  STAFF: "STAFF",
  IGNORE: "IGNORE",
  /**
   * Staff-adjacent roles that carry no hierarchy level. Stored as many rows
   * per guild (like IGNORE), never as a singleton and never on the ladder.
   */
  ACCESS: "ACCESS",
  /**
   * Given on Staff acceptance. Its own role type — never a ladder rung, never
   * an Access Role, and it carries a *level range* it applies to rather than a
   * level of its own.
   */
  ACCEPTED: "ACCEPTED",
  /**
   * Extra roles handed out automatically for a window of numbered levels.
   * Many rows per guild, each with its own range. Never on the ladder.
   */
  ASSIGN: "ASSIGN",
  /**
   * A Staff Type role (MAX, DEV, …). One row per configured type, discriminated
   * by the `staffType` field rather than by a type-per-enum-entry, so a new
   * Staff Type needs no new RoleConfigType. Never on the ladder.
   */
  STAFF_TYPE: "STAFF_TYPE",
  BLACKLIST: "BLACKLIST",
  STAFF_MANAGER: "STAFF_MANAGER",
  OWNER_MANAGER: "OWNER_MANAGER",
  /**
   * May run `!transfer`. Its authority comes from this configuration row alone —
   * where the role physically sits in the Discord list is never consulted.
   */
  TRANSFER_MANAGER: "TRANSFER_MANAGER",
  WARN_1: "WARN_1",
  WARN_2: "WARN_2",
  WARN_3: "WARN_3",
  MUTE: "MUTE",
  JAIL: "JAIL",
  CHAT_MANAGER: "CHAT_MANAGER",
  VACATION: "VACATION",
  APPEAL_MANAGER: "APPEAL_MANAGER",
  GIFT_MANAGER: "GIFT_MANAGER",
  APPLY_MANAGER: "APPLY_MANAGER",
  TAG: "TAG",
} as const;
export type RoleConfigType = (typeof RoleConfigType)[keyof typeof RoleConfigType];
export const ROLE_CONFIG_TYPE_VALUES = Object.values(RoleConfigType);

export const NUMBERED_ROLE_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.START,
  RoleConfigType.END,
  RoleConfigType.STAFF,
];

export const SINGLETON_ROLE_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.START,
  RoleConfigType.END,
  RoleConfigType.STAFF,
  RoleConfigType.BLACKLIST,
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.OWNER_MANAGER,
  RoleConfigType.TRANSFER_MANAGER,
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.VACATION,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.TAG,
  RoleConfigType.ACCEPTED,
];

/**
 * Staff hierarchy tiers. A tier is never stored on a member — it is derived
 * from the member's numbered level and the configured boundary roles, so
 * there are no hard-coded level ranges anywhere.
 */
export const StaffTier = {
  STAFF: "STAFF",
  HIGHSTAFF: "HIGHSTAFF",
  OWNER: "OWNER",
  SHIP: "SHIP",
} as const;
export type StaffTier = (typeof StaffTier)[keyof typeof StaffTier];
export const STAFF_TIER_VALUES = Object.values(StaffTier);

/**
 * Tiers that are opened by a configured boundary role, ordered low → high.
 * STAFF is excluded: it is the implicit floor starting at the START role.
 */
export const STAFF_TIER_BOUNDARIES: readonly StaffTier[] = [
  StaffTier.HIGHSTAFF,
  StaffTier.OWNER,
  StaffTier.SHIP,
];

export const ChannelConfigType = {
  USER_WARNS: "USER_WARNS",
  STAFF_WARNS: "STAFF_WARNS",
  WARNING_LOG: "WARNING_LOG",
  /**
   * Where the plain four-line "Staff Warn X" announcement is posted when a
   * REAL staff warning is created. Deliberately its own slot: STAFF_WARNS is
   * the channel managers *type* `!warn` in, and WARNING_LOG carries the embed
   * audit trail — this one is neither.
   */
  STAFF_WARN_ANNOUNCE: "STAFF_WARN_ANNOUNCE",
  REPORTS: "REPORTS",
  REPORT_LOG: "REPORT_LOG",
  PUNISHMENT_LOG: "PUNISHMENT_LOG",
  APPEALS: "APPEALS",
  BAN_APPROVAL: "BAN_APPROVAL",
  KICK_APPROVAL: "KICK_APPROVAL",
  VACATION_REQUESTS: "VACATION_REQUESTS",
  GIFT_CLAIMS: "GIFT_CLAIMS",
  SUPPORT: "SUPPORT",
  SERVER_TAG_LOG: "SERVER_TAG_LOG",
} as const;
export type ChannelConfigType = (typeof ChannelConfigType)[keyof typeof ChannelConfigType];
export const CHANNEL_CONFIG_TYPE_VALUES = Object.values(ChannelConfigType);

export const FastAccessContext = {
  MODMAIL: "MODMAIL",
  SUPPORT: "SUPPORT",
} as const;
export type FastAccessContext = (typeof FastAccessContext)[keyof typeof FastAccessContext];
export const FAST_ACCESS_CONTEXT_VALUES = Object.values(FastAccessContext);
