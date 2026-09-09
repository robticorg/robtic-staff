import { ValidationError } from "../../../shared/utils/errors.ts";

export const AppealStatus = {
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type AppealStatus = (typeof AppealStatus)[keyof typeof AppealStatus];
export const APPEAL_STATUS_VALUES = Object.values(AppealStatus);

export const DECIDABLE_APPEAL_STATUSES: readonly AppealStatus[] = [
  AppealStatus.PENDING,
  AppealStatus.CLAIMED,
  AppealStatus.UNDER_REVIEW,
];

export const OPEN_APPEAL_STATUSES: readonly AppealStatus[] = DECIDABLE_APPEAL_STATUSES;

const APPEAL_TRANSITIONS: Record<AppealStatus, readonly AppealStatus[]> = {
  [AppealStatus.PENDING]: [
    AppealStatus.CLAIMED,
    AppealStatus.UNDER_REVIEW,
    AppealStatus.ACCEPTED,
    AppealStatus.REJECTED,
    AppealStatus.CANCELLED,
  ],
  [AppealStatus.CLAIMED]: [
    AppealStatus.UNDER_REVIEW,
    AppealStatus.ACCEPTED,
    AppealStatus.REJECTED,
    AppealStatus.CANCELLED,
  ],
  [AppealStatus.UNDER_REVIEW]: [
    AppealStatus.ACCEPTED,
    AppealStatus.REJECTED,
    AppealStatus.CANCELLED,
  ],
  [AppealStatus.ACCEPTED]: [],
  [AppealStatus.REJECTED]: [],
  [AppealStatus.CANCELLED]: [],
};

export function canAppealTransition(from: AppealStatus, to: AppealStatus): boolean {
  if (from === to) return true;
  return APPEAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertAppealTransition(from: AppealStatus, to: AppealStatus): void {
  if (!canAppealTransition(from, to)) {
    throw new ValidationError(`Illegal appeal transition: ${from} → ${to}`, { from, to });
  }
}

export const AppealTargetType = {
  USER_WARNING: "USER_WARNING",
  STAFF_WARNING: "STAFF_WARNING",
  PUNISHMENT: "PUNISHMENT",
} as const;
export type AppealTargetType = (typeof AppealTargetType)[keyof typeof AppealTargetType];
export const APPEAL_TARGET_TYPE_VALUES = Object.values(AppealTargetType);

export const AppealDecision = {
  UPHELD: "UPHELD",
  OVERTURNED: "OVERTURNED",
  REDUCED: "REDUCED",
} as const;
export type AppealDecision = (typeof AppealDecision)[keyof typeof AppealDecision];
export const APPEAL_DECISION_VALUES = Object.values(AppealDecision);
