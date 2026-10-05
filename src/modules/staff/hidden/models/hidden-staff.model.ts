import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../../shared/types/index.ts";
import { shortId } from "../../../../shared/utils/id.ts";

export interface HiddenStaff extends Timestamps {
  hiddenStaffId: string;
  guildId: GuildId;
  userId: UserId;
  active: boolean;
  currentLevel: number;
  acceptedBy?: UserId | null;
  acceptedAt?: Date | null;
  removedBy?: UserId | null;
  removedAt?: Date | null;
}

export type HiddenStaffDocument = HydratedDocument<HiddenStaff>;

const hiddenStaffSchema = new Schema<HiddenStaff>(
  {
    hiddenStaffId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
    currentLevel: { type: Number, required: true, default: 0, min: 0 },
    acceptedBy: { type: String, default: null },
    acceptedAt: { type: Date, default: null },
    removedBy: { type: String, default: null },
    removedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "hidden_staff" },
);

hiddenStaffSchema.index({ guildId: 1, userId: 1 }, { unique: true });
hiddenStaffSchema.index({ guildId: 1, active: 1 });

export const HiddenStaffModel: Model<HiddenStaff> =
  (mongoose.models.HiddenStaff as Model<HiddenStaff> | undefined) ??
  mongoose.model<HiddenStaff>("HiddenStaff", hiddenStaffSchema);
