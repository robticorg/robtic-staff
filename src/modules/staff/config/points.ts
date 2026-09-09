import { StaffPointTransactionType } from "../types/enums.ts";

export const DEFAULT_POINT_VALUES: Record<StaffPointTransactionType, number> = {
  [StaffPointTransactionType.REPORT_CLAIM]: 1,
  [StaffPointTransactionType.TICKET_CLAIM]: 1,
  [StaffPointTransactionType.GIFT_CLAIM]: 1,
  [StaffPointTransactionType.USER_WARNING]: 1,
  [StaffPointTransactionType.STAFF_WARNING]: 1,
  [StaffPointTransactionType.APPEAL_SUCCESS_PENALTY]: -2,
  [StaffPointTransactionType.MANUAL_ADJUSTMENT]: 0,
  [StaffPointTransactionType.OTHER]: 0,
};

export const APPEAL_SUCCESS_PENALTY = DEFAULT_POINT_VALUES[
  StaffPointTransactionType.APPEAL_SUCCESS_PENALTY
];
