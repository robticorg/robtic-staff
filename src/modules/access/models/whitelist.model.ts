import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";

export interface WhitelistEntry extends Timestamps {
  guildId: GuildId;
  userId: UserId;
  addedBy: UserId;
}

export type WhitelistEntryDocument = HydratedDocument<WhitelistEntry>;

const whitelistSchema = new Schema<WhitelistEntry>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    addedBy: { type: String, required: true },
  },
  { timestamps: true, collection: "access_whitelist" },
);

whitelistSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const WhitelistModel: Model<WhitelistEntry> =
  (mongoose.models.WhitelistEntry as Model<WhitelistEntry> | undefined) ??
  mongoose.model<WhitelistEntry>("WhitelistEntry", whitelistSchema);
