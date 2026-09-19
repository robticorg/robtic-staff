import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId } from "../../../shared/types/index.ts";

/** Guild-wide knobs for the staff system that are numbers, not roles or channels. */
export interface StaffConfig {
  guildId: GuildId;

  /** Minimum weekly points a staff member needs to count as promotion-eligible. */
  promotionPointsRequired?: number;

  createdAt: Date;
  updatedAt: Date;
}

export type StaffConfigDocument = HydratedDocument<StaffConfig>;

const staffConfigSchema = new Schema<StaffConfig>(
  {
    guildId: { type: String, required: true },
    promotionPointsRequired: { type: Number, min: 1 },
  },
  { timestamps: true, collection: "staff_configs" },
);

staffConfigSchema.index({ guildId: 1 }, { unique: true });

export const StaffConfigModel: Model<StaffConfig> =
  (mongoose.models.StaffConfig as Model<StaffConfig> | undefined) ??
  mongoose.model<StaffConfig>("StaffConfig", staffConfigSchema);
