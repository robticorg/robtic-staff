export const RoleConfigType = {
  START: "START",
  END: "END",
  STAFF: "STAFF",
  IGNORE: "IGNORE",

  ACCESS: "ACCESS",

  ACCEPTED: "ACCEPTED",

  ASSIGN: "ASSIGN",

  STAFF_TYPE: "STAFF_TYPE",
  BLACKLIST: "BLACKLIST",
  STAFF_MANAGER: "STAFF_MANAGER",
  OWNER_MANAGER: "OWNER_MANAGER",

  TRANSFER_MANAGER: "TRANSFER_MANAGER",
  WARN_1: "WARN_1",
  WARN_2: "WARN_2",
  WARN_3: "WARN_3",
  /**
   * The Owner warning ladder — a second, completely separate set of three
   * warning roles used when the target sits at Owner tier or above. Never
   * mixed with WARN_1/2/3.
   */
  OWNER_WARN_1: "OWNER_WARN_1",
  OWNER_WARN_2: "OWNER_WARN_2",
  OWNER_WARN_3: "OWNER_WARN_3",
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
  RoleConfigType.OWNER_WARN_1,
  RoleConfigType.OWNER_WARN_2,
  RoleConfigType.OWNER_WARN_3,
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

export const StaffTier = {
  STAFF: "STAFF",
  HIGHSTAFF: "HIGHSTAFF",
  OWNER: "OWNER",
  SHIP: "SHIP",
} as const;
export type StaffTier = (typeof StaffTier)[keyof typeof StaffTier];
export const STAFF_TIER_VALUES = Object.values(StaffTier);

export const STAFF_TIER_BOUNDARIES: readonly StaffTier[] = [
  StaffTier.HIGHSTAFF,
  StaffTier.OWNER,
  StaffTier.SHIP,
];

export const ChannelConfigType = {
  USER_WARNS: "USER_WARNS",
  STAFF_WARNS: "STAFF_WARNS",
  WARNING_LOG: "WARNING_LOG",

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
