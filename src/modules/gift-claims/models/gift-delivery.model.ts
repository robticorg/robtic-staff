import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  GIFT_DELIVERY_STATUS_VALUES,
  GIFT_DELIVERY_TYPE_VALUES,
  GiftDeliveryStatus,
  LINK_DELIVERY_PATH_VALUES,
  type GiftDeliveryType,
  type LinkDeliveryPath,
} from "../types/enums.ts";

export interface GiftDeliveryProofRef {
  proofId: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface GiftDelivery extends Timestamps {
  deliveryId: string;
  guildId: GuildId;
  claimId: string;
  userId: UserId;

  type: GiftDeliveryType;
  status: GiftDeliveryStatus;

  amount?: string;
  secret?: string;
  additionalInfo?: string;

  deliveryPath?: LinkDeliveryPath;
  deliveryChannelId?: ChannelId;
  deliveryMessageId?: string;
  auditMessageId?: string;

  claimedBy?: UserId;
  claimedAt?: Date;
  deliveredBy?: UserId;
  deliveredAt?: Date;

  proof: GiftDeliveryProofRef[];

  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
}

export type GiftDeliveryDocument = HydratedDocument<GiftDelivery>;

const proofRefSchema = new Schema<GiftDeliveryProofRef>(
  {
    proofId: { type: String, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const schema = new Schema<GiftDelivery>(
  {
    deliveryId: { type: String, required: true, unique: true, default: () => shortId(12) },
    guildId: { type: String, required: true, index: true },
    claimId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },

    type: { type: String, enum: GIFT_DELIVERY_TYPE_VALUES, required: true },
    status: {
      type: String,
      enum: GIFT_DELIVERY_STATUS_VALUES,
      default: GiftDeliveryStatus.PENDING,
      required: true,
      index: true,
    },

    amount: { type: String, maxlength: 30 },
    secret: { type: String, select: false },
    additionalInfo: { type: String, maxlength: 1000 },

    deliveryPath: { type: String, enum: LINK_DELIVERY_PATH_VALUES },
    deliveryChannelId: { type: String, index: true },
    deliveryMessageId: { type: String },
    auditMessageId: { type: String },

    claimedBy: { type: String },
    claimedAt: { type: Date },
    deliveredBy: { type: String },
    deliveredAt: { type: Date },

    proof: { type: [proofRefSchema], default: [] },

    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
    error: { type: String, maxlength: 300 },
  },
  { collection: "gift_deliveries", versionKey: false, timestamps: true },
);

schema.index({ status: 1, type: 1 });

export const GiftDeliveryModel: Model<GiftDelivery> =
  (mongoose.models.GiftDelivery as Model<GiftDelivery> | undefined) ??
  mongoose.model<GiftDelivery>("GiftDelivery", schema);
