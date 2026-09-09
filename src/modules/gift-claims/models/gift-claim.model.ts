import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import { GIFT_CLAIM_STATUS_VALUES, GiftClaimStatus } from "../types/enums.ts";

export interface ClaimProof {
  url: string;
  uploadedAt: Date;
}

export interface GiftClaim extends Timestamps {
  claimId: string;
  guildId: GuildId;
  userId: UserId;

  rewardName: string;
  prize?: string;

  status: GiftClaimStatus;

  proof: ClaimProof[];
  fulfillmentProof?: string;

  channelId?: string;
  messageId?: string;

  reviewedBy?: UserId;
  reviewedAt?: Date;
  fulfilledBy?: UserId;
  fulfilledAt?: Date;
  rejectionReason?: string;

  metadata?: Record<string, unknown>;
}

export type GiftClaimDocument = HydratedDocument<GiftClaim>;

const proofSchema = new Schema<ClaimProof>(
  {
    url: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const giftClaimSchema = new Schema<GiftClaim>(
  {
    claimId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    rewardName: { type: String, required: true, trim: true, maxlength: 200 },
    prize: { type: String, trim: true, maxlength: 300 },

    status: {
      type: String,
      enum: GIFT_CLAIM_STATUS_VALUES,
      default: GiftClaimStatus.PENDING,
      required: true,
      index: true,
    },

    proof: { type: [proofSchema], default: [] },
    fulfillmentProof: { type: String },

    channelId: { type: String, index: true },
    messageId: { type: String },

    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    fulfilledBy: { type: String },
    fulfilledAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "gift_claims" },
);

giftClaimSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
giftClaimSchema.index({ guildId: 1, status: 1 });
giftClaimSchema.index({ userId: 1, status: 1 });

export const GiftClaimModel: Model<GiftClaim> =
  (mongoose.models.GiftClaim as Model<GiftClaim> | undefined) ??
  mongoose.model<GiftClaim>("GiftClaim", giftClaimSchema);
