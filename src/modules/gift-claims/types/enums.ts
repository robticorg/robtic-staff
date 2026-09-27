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
  DELIVERY_FAILED: "GIFT_DELIVERY_FAILED",
  DELIVERY_READY: "GIFT_DELIVERY_READY",
  DELIVERY_CLAIMED: "GIFT_DELIVERY_CLAIMED",
} as const;
export type GiftClaimAuditAction =
  (typeof GiftClaimAuditAction)[keyof typeof GiftClaimAuditAction];
export const GIFT_CLAIM_AUDIT_ACTION_VALUES = Object.values(GiftClaimAuditAction);

export const GiftClaimSource = {
  PANEL: "PANEL",
  COMMAND: "COMMAND",
} as const;
export type GiftClaimSource = (typeof GiftClaimSource)[keyof typeof GiftClaimSource];
export const GIFT_CLAIM_SOURCE_VALUES = Object.values(GiftClaimSource);

export const GiftDeliveryType = {
  CREDITS: "CREDITS",
  LINK: "LINK",
  OTHER: "OTHER",
} as const;
export type GiftDeliveryType = (typeof GiftDeliveryType)[keyof typeof GiftDeliveryType];
export const GIFT_DELIVERY_TYPE_VALUES = Object.values(GiftDeliveryType);

export const GiftDeliveryStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  READY: "READY",
  CLAIMED: "CLAIMED",
  FULFILLED: "FULFILLED",
  FAILED: "FAILED",
} as const;
export type GiftDeliveryStatus = (typeof GiftDeliveryStatus)[keyof typeof GiftDeliveryStatus];
export const GIFT_DELIVERY_STATUS_VALUES = Object.values(GiftDeliveryStatus);

export const RETRYABLE_DELIVERY_STATUSES: readonly GiftDeliveryStatus[] = [
  GiftDeliveryStatus.PENDING,
  GiftDeliveryStatus.FAILED,
];

export const LinkDeliveryPath = {
  DM: "DM",
  CHANNEL: "CHANNEL",
} as const;
export type LinkDeliveryPath = (typeof LinkDeliveryPath)[keyof typeof LinkDeliveryPath];
export const LINK_DELIVERY_PATH_VALUES = Object.values(LinkDeliveryPath);
