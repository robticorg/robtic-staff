import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";

export interface GiftDeliveryProof extends Timestamps {
  proofId: string;
  deliveryId: string;
  guildId: GuildId;
  uploadedBy: UserId;
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export type GiftDeliveryProofDocument = HydratedDocument<GiftDeliveryProof>;

const schema = new Schema<GiftDeliveryProof>(
  {
    proofId: { type: String, required: true, unique: true, default: () => shortId(10) },
    deliveryId: { type: String, required: true, index: true },
    guildId: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    filename: { type: String, required: true, maxlength: 200 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    data: { type: Buffer, required: true },
  },
  { collection: "gift_delivery_proofs", versionKey: false, timestamps: true },
);

export const GiftDeliveryProofModel: Model<GiftDeliveryProof> =
  (mongoose.models.GiftDeliveryProof as Model<GiftDeliveryProof> | undefined) ??
  mongoose.model<GiftDeliveryProof>("GiftDeliveryProof", schema);
