import { StaffPointTransactionType } from "../types/enums.ts";

/**
 * How many points each action is worth — the single place to change them.
 * (MANUAL_ADJUSTMENT / OTHER and the points-API types — MESSAGE, SPECIAL_POST,
 * PRIVATE_CHANNEL_*, SELLER_ROLE — use the amount whoever sends them chooses.)
 */
export const DEFAULT_POINT_VALUES: Record<StaffPointTransactionType, number> = {
  [StaffPointTransactionType.REPORT_CLAIM]: 1,
  [StaffPointTransactionType.TICKET_CLAIM]: 2,
  [StaffPointTransactionType.GIFT_CLAIM]: 1,
  [StaffPointTransactionType.USER_WARNING]: 2,
  [StaffPointTransactionType.STAFF_WARNING]: 1,
  [StaffPointTransactionType.MESSAGE]: 1,
  [StaffPointTransactionType.JAIL]: 1,
  [StaffPointTransactionType.STAFF_ACCEPT]: 1,
  [StaffPointTransactionType.SPECIAL_POST]: 1,
  [StaffPointTransactionType.PRIVATE_CHANNEL_CREATE]: 1,
  [StaffPointTransactionType.PRIVATE_CHANNEL_DELETE]: 1,
  [StaffPointTransactionType.SELLER_ROLE]: 1,
  [StaffPointTransactionType.APPEAL_SUCCESS_PENALTY]: -2,
  [StaffPointTransactionType.MANUAL_ADJUSTMENT]: 0,
  [StaffPointTransactionType.OTHER]: 0,
};

export const APPEAL_SUCCESS_PENALTY = DEFAULT_POINT_VALUES[
  StaffPointTransactionType.APPEAL_SUCCESS_PENALTY
];
