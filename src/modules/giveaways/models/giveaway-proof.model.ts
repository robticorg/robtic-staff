import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";

export interface GiveawayProof extends Timestamps {
  giveawayId: string;
  guildId: GuildId;
  userId: UserId;
  provedBy: UserId;
}

export type GiveawayProofDocument = HydratedDocument<GiveawayProof>;

const giveawayProofSchema = new Schema<GiveawayProof>(
  {
    giveawayId: { type: String, required: true },
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    provedBy: { type: String, required: true },
  },
  { timestamps: true, collection: "giveaway_proofs" },
);

giveawayProofSchema.index({ giveawayId: 1, userId: 1 }, { unique: true });

export const GiveawayProofModel: Model<GiveawayProof> =
  (mongoose.models.GiveawayProof as Model<GiveawayProof> | undefined) ??
  mongoose.model<GiveawayProof>("GiveawayProof", giveawayProofSchema);
