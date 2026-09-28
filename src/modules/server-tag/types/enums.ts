import { ValidationError } from "../../../shared/utils/errors.ts";

export const StaffTagRestrictionStatus = {
  ACTIVE: "ACTIVE",
  RESTORED: "RESTORED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type StaffTagRestrictionStatus =
  (typeof StaffTagRestrictionStatus)[keyof typeof StaffTagRestrictionStatus];
export const STAFF_TAG_RESTRICTION_STATUS_VALUES = Object.values(StaffTagRestrictionStatus);

export const StaffTagRestrictionKind = {
  /** Staff dropped the tag/identifier — timed; expiry removes them from staff. */
  TAG_REMOVED: "TAG_REMOVED",
  /** Freshly accepted without a tag/identifier — roles held until they comply, never expires. */
  AWAITING_IDENTITY: "AWAITING_IDENTITY",
} as const;
export type StaffTagRestrictionKind =
  (typeof StaffTagRestrictionKind)[keyof typeof StaffTagRestrictionKind];
export const STAFF_TAG_RESTRICTION_KIND_VALUES = Object.values(StaffTagRestrictionKind);

export const StaffTagRestorationReason = {
  TAG_REAPPLIED: "TAG_REAPPLIED",

  DISPLAY_NAME_COMPLIANT: "DISPLAY_NAME_COMPLIANT",

  DURATION_EXPIRED: "DURATION_EXPIRED",

  STAFF_LIFECYCLE: "STAFF_LIFECYCLE",

  MANUAL: "MANUAL",
} as const;
export type StaffTagRestorationReason =
  (typeof StaffTagRestorationReason)[keyof typeof StaffTagRestorationReason];
export const STAFF_TAG_RESTORATION_REASON_VALUES = Object.values(StaffTagRestorationReason);

export const TagTransition = {
  ENABLED: "ENABLED",
  DISABLED: "DISABLED",
  UNCHANGED: "UNCHANGED",
} as const;
export type TagTransition = (typeof TagTransition)[keyof typeof TagTransition];

const RESTRICTION_TRANSITIONS: Record<
  StaffTagRestrictionStatus,
  readonly StaffTagRestrictionStatus[]
> = {
  [StaffTagRestrictionStatus.ACTIVE]: [
    StaffTagRestrictionStatus.RESTORED,
    StaffTagRestrictionStatus.EXPIRED,
    StaffTagRestrictionStatus.CANCELLED,
  ],
  [StaffTagRestrictionStatus.RESTORED]: [],
  [StaffTagRestrictionStatus.EXPIRED]: [],
  [StaffTagRestrictionStatus.CANCELLED]: [],
};

export function canRestrictionTransition(
  from: StaffTagRestrictionStatus,
  to: StaffTagRestrictionStatus,
): boolean {
  if (from === to) return true;
  return RESTRICTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertRestrictionTransition(
  from: StaffTagRestrictionStatus,
  to: StaffTagRestrictionStatus,
): void {
  if (!canRestrictionTransition(from, to)) {
    throw new ValidationError(`Illegal staff tag restriction transition: ${from} → ${to}`, {
      from,
      to,
    });
  }
}
