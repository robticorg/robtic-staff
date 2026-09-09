export const WarningStatus = {
  ACTIVE: "ACTIVE",
  CONVERTED: "CONVERTED",
  REMOVED: "REMOVED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;
export type WarningStatus = (typeof WarningStatus)[keyof typeof WarningStatus];
export const WARNING_STATUS_VALUES = Object.values(WarningStatus);

export const WarningSource = {
  DIRECT: "DIRECT",

  REPORT: "REPORT",
} as const;
export type WarningSource = (typeof WarningSource)[keyof typeof WarningSource];
export const WARNING_SOURCE_VALUES = Object.values(WarningSource);

export const StaffWarningType = {
  VERBAL: "VERBAL",
  REAL: "REAL",
} as const;
export type StaffWarningType = (typeof StaffWarningType)[keyof typeof StaffWarningType];
export const STAFF_WARNING_TYPE_VALUES = Object.values(StaffWarningType);

export const StaffWarningRealSource = {
  MANUAL: "MANUAL",
  VERBAL_ESCALATION: "VERBAL_ESCALATION",
} as const;
export type StaffWarningRealSource =
  (typeof StaffWarningRealSource)[keyof typeof StaffWarningRealSource];
export const STAFF_WARNING_REAL_SOURCE_VALUES = Object.values(StaffWarningRealSource);

export const StaffWarningLevel = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
} as const;
export type StaffWarningLevel = (typeof StaffWarningLevel)[keyof typeof StaffWarningLevel];
export const STAFF_WARNING_LEVEL_VALUES: readonly number[] = [1, 2, 3];

export const STAFF_WARNING_FIRE_LEVEL: StaffWarningLevel = StaffWarningLevel.THREE;

export const VERBAL_WARNINGS_PER_REAL = 3;
