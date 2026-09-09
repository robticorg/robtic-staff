import { ValidationError } from "../../../shared/utils/errors.ts";

export const VacationType = {
  MANUAL: "MANUAL",
  APPLICATION: "APPLICATION",
} as const;
export type VacationType = (typeof VacationType)[keyof typeof VacationType];
export const VACATION_TYPE_VALUES = Object.values(VacationType);

export const VacationSource = {
  MANUAL_COMMAND: "MANUAL_COMMAND",
  APPLICATION: "APPLICATION",
} as const;
export type VacationSource = (typeof VacationSource)[keyof typeof VacationSource];
export const VACATION_SOURCE_VALUES = Object.values(VacationSource);

export const VacationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type VacationStatus = (typeof VacationStatus)[keyof typeof VacationStatus];
export const VACATION_STATUS_VALUES = Object.values(VacationStatus);

export const OPEN_VACATION_STATUSES: readonly VacationStatus[] = [
  VacationStatus.PENDING,
  VacationStatus.APPROVED,
  VacationStatus.ACTIVE,
];

export const VacationDurationUnit = {
  MINUTES: "MINUTES",
  DAYS: "DAYS",
  WEEKS: "WEEKS",
  MONTHS: "MONTHS",
} as const;
export type VacationDurationUnit =
  (typeof VacationDurationUnit)[keyof typeof VacationDurationUnit];
export const VACATION_DURATION_UNIT_VALUES = Object.values(VacationDurationUnit);

const VACATION_TRANSITIONS: Record<VacationStatus, readonly VacationStatus[]> = {
  [VacationStatus.PENDING]: [
    VacationStatus.APPROVED,
    VacationStatus.REJECTED,
    VacationStatus.ACTIVE,
    VacationStatus.CANCELLED,
  ],
  [VacationStatus.APPROVED]: [
    VacationStatus.ACTIVE,
    VacationStatus.PENDING,
    VacationStatus.CANCELLED,
  ],
  [VacationStatus.ACTIVE]: [VacationStatus.COMPLETED, VacationStatus.CANCELLED],
  [VacationStatus.REJECTED]: [],
  [VacationStatus.COMPLETED]: [],
  [VacationStatus.CANCELLED]: [],
};

export function canVacationTransition(from: VacationStatus, to: VacationStatus): boolean {
  if (from === to) return true;
  return VACATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertVacationTransition(from: VacationStatus, to: VacationStatus): void {
  if (!canVacationTransition(from, to)) {
    throw new ValidationError(`Illegal vacation transition: ${from} → ${to}`, { from, to });
  }
}
