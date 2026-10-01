import { StaffPointTransactionType } from "../types/enums.ts";

/**
 * How many points each action is worth — the single place to change them.
 * (MANUAL_ADJUSTMENT / OTHER / MESSAGE amounts come from whoever sends them.)
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
  [StaffPointTransactionType.APPEAL_SUCCESS_PENALTY]: -2,
  [StaffPointTransactionType.MANUAL_ADJUSTMENT]: 0,
  [StaffPointTransactionType.OTHER]: 0,
};

export const APPEAL_SUCCESS_PENALTY = DEFAULT_POINT_VALUES[
  StaffPointTransactionType.APPEAL_SUCCESS_PENALTY
];
