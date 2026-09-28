import { colors } from "../config/colors.ts";
import { GiftClaimStatus } from "../../modules/gift-claims/types/enums.ts";

export const GIFT_CLAIM_PANEL_ID = "gift-claim";

export const giftClaimConfig = {
  maxProofImages: 5,

  delivery: {
    maxProofFiles: 1,
    maxProofBytes: 8 * 1024 * 1024,
    maxAmountDigits: 15,
    maxLinkLength: 500,
    processingStaleMs: 5 * 60_000,
    commandDraftTtlMs: 15 * 60_000,
    deliveryChannelPrefix: "gift",
  },

  caseAccentColor: {
    [GiftClaimStatus.PENDING]: colors.warning,
    [GiftClaimStatus.RE_REQUESTED]: colors.warning,
    [GiftClaimStatus.APPROVED]: colors.success,
    [GiftClaimStatus.REJECTED]: colors.error,
    [GiftClaimStatus.FULFILLED]: colors.neutral,
  } as Record<GiftClaimStatus, number>,
} as const;
