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

export const StaffTagRestorationReason = {
  /** The member started using the Server Tag again before the window closed. */
  TAG_REAPPLIED: "TAG_REAPPLIED",
  /** The 3-day window elapsed — restoration does not require the tag. */
  DURATION_EXPIRED: "DURATION_EXPIRED",
  /** A Staff-lifecycle change (fired / blacklisted) voided the restriction. */
  STAFF_LIFECYCLE: "STAFF_LIFECYCLE",
  /** Tag role configuration was removed, or an operator cancelled it. */
  MANUAL: "MANUAL",
} as const;
export type StaffTagRestorationReason =
  (typeof StaffTagRestorationReason)[keyof typeof StaffTagRestorationReason];
export const STAFF_TAG_RESTORATION_REASON_VALUES = Object.values(StaffTagRestorationReason);

/**
 * Whether the user is using *this* guild's Server Tag.
 *
 * `primaryGuild.tag` is deliberately ignored: Server Tags are not globally
 * unique, so the guild id is the only trustworthy signal.
 */
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
