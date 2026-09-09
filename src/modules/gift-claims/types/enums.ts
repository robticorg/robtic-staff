import { ValidationError } from "../../../shared/utils/errors.ts";

export const GiftClaimStatus = {
  PENDING: "PENDING",
  RE_REQUESTED: "RE_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  FULFILLED: "FULFILLED",
} as const;
export type GiftClaimStatus = (typeof GiftClaimStatus)[keyof typeof GiftClaimStatus];
export const GIFT_CLAIM_STATUS_VALUES = Object.values(GiftClaimStatus);

export const DECIDABLE_CLAIM_STATUSES: readonly GiftClaimStatus[] = [
  GiftClaimStatus.PENDING,
  GiftClaimStatus.RE_REQUESTED,
];

const CLAIM_TRANSITIONS: Record<GiftClaimStatus, readonly GiftClaimStatus[]> = {
  [GiftClaimStatus.PENDING]: [
    GiftClaimStatus.RE_REQUESTED,
    GiftClaimStatus.APPROVED,
    GiftClaimStatus.REJECTED,
  ],
  [GiftClaimStatus.RE_REQUESTED]: [
    GiftClaimStatus.RE_REQUESTED,
    GiftClaimStatus.APPROVED,
    GiftClaimStatus.REJECTED,
  ],
  [GiftClaimStatus.APPROVED]: [GiftClaimStatus.FULFILLED],
  [GiftClaimStatus.REJECTED]: [],
  [GiftClaimStatus.FULFILLED]: [],
};

export function canClaimTransition(from: GiftClaimStatus, to: GiftClaimStatus): boolean {
  if (from === to) return true;
  return CLAIM_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertClaimTransition(from: GiftClaimStatus, to: GiftClaimStatus): void {
  if (!canClaimTransition(from, to)) {
    throw new ValidationError(`Illegal gift-claim transition: ${from} → ${to}`, { from, to });
  }
}

export const GiftClaimAuditAction = {
  CREATED: "GIFT_CLAIM_CREATED",
  PROOF_RECEIVED: "GIFT_CLAIM_PROOF_RECEIVED",
  RE_REQUESTED: "GIFT_CLAIM_RE_REQUESTED",
  APPROVED: "GIFT_CLAIM_APPROVED",
  REJECTED: "GIFT_CLAIM_REJECTED",
  FULFILLED: "GIFT_CLAIM_FULFILLED",
} as const;
export type GiftClaimAuditAction =
  (typeof GiftClaimAuditAction)[keyof typeof GiftClaimAuditAction];
export const GIFT_CLAIM_AUDIT_ACTION_VALUES = Object.values(GiftClaimAuditAction);
