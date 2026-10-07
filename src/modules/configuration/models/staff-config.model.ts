import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId } from "../../../shared/types/index.ts";

/** Guild-wide knobs for the staff system that are numbers, not roles or channels. */
export interface StaffConfig {
  guildId: GuildId;

  /** Minimum weekly points a staff member needs to count as promotion-eligible. */
  promotionPointsRequired?: number;

  autoclaimEnabled?: boolean;

  /** Per-guild overrides of how many points each bot-awarded action is worth (/points values). */
  pointValues?: Record<string, number>;

  /** The number the first ladder role is shown as — 0 (default) or 1 (/start-count). */
  levelStart?: number;

  createdAt: Date;
  updatedAt: Date;
}

export type StaffConfigDocument = HydratedDocument<StaffConfig>;

const staffConfigSchema = new Schema<StaffConfig>(
  {
    guildId: { type: String, required: true },
    promotionPointsRequired: { type: Number, min: 1 },
    autoclaimEnabled: { type: Boolean, default: false },
    pointValues: { type: Schema.Types.Mixed, default: undefined },
    levelStart: { type: Number, min: 0, max: 1 },
  },
  { timestamps: true, collection: "staff_configs" },
);

staffConfigSchema.index({ guildId: 1 }, { unique: true });

export const StaffConfigModel: Model<StaffConfig> =
  (mongoose.models.StaffConfig as Model<StaffConfig> | undefined) ??
  mongoose.model<StaffConfig>("StaffConfig", staffConfigSchema);
