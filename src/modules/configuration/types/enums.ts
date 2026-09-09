export const RoleConfigType = {
  START: "START",
  END: "END",
  STAFF: "STAFF",
  IGNORE: "IGNORE",
  BLACKLIST: "BLACKLIST",
  STAFF_MANAGER: "STAFF_MANAGER",
  WARN_1: "WARN_1",
  WARN_2: "WARN_2",
  WARN_3: "WARN_3",
  MUTE: "MUTE",
  JAIL: "JAIL",
  CHAT_MANAGER: "CHAT_MANAGER",
  VACATION: "VACATION",
  APPEAL_MANAGER: "APPEAL_MANAGER",
  GIFT_MANAGER: "GIFT_MANAGER",
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
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.VACATION,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
];

export const ChannelConfigType = {
  USER_WARNS: "USER_WARNS",
  STAFF_WARNS: "STAFF_WARNS",
  WARNING_LOG: "WARNING_LOG",
  REPORTS: "REPORTS",
  REPORT_LOG: "REPORT_LOG",
  PUNISHMENT_LOG: "PUNISHMENT_LOG",
  APPEALS: "APPEALS",
  BAN_APPROVAL: "BAN_APPROVAL",
  KICK_APPROVAL: "KICK_APPROVAL",
  VACATION_REQUESTS: "VACATION_REQUESTS",
  GIFT_CLAIMS: "GIFT_CLAIMS",
  SUPPORT: "SUPPORT",
} as const;
export type ChannelConfigType = (typeof ChannelConfigType)[keyof typeof ChannelConfigType];
export const CHANNEL_CONFIG_TYPE_VALUES = Object.values(ChannelConfigType);

export const FastAccessContext = {
  MODMAIL: "MODMAIL",
  SUPPORT: "SUPPORT",
} as const;
export type FastAccessContext = (typeof FastAccessContext)[keyof typeof FastAccessContext];
export const FAST_ACCESS_CONTEXT_VALUES = Object.values(FastAccessContext);
