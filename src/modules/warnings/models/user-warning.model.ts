import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import {
  WARNING_SOURCE_VALUES,
  WARNING_STATUS_VALUES,
  WarningSource,
  WarningStatus,
} from "../types/enums.ts";

export interface UserWarning {
  userId: UserId;
  guildId: GuildId;
  reason: string;
  evidence: string[];
  issuedBy: UserId;
  status: WarningStatus;
  source: WarningSource;

  reportId?: string;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: UserId;
  revokeReason?: string;
}

export type UserWarningDocument = HydratedDocument<UserWarning>;

const userWarningSchema = new Schema<UserWarning>(
  {
    userId: { type: String, required: true },
    guildId: { type: String, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    evidence: { type: [String], default: [] },
    issuedBy: { type: String, required: true },
    status: {
      type: String,
      enum: WARNING_STATUS_VALUES,
      default: WarningStatus.ACTIVE,
      required: true,
    },
    source: {
      type: String,
      enum: WARNING_SOURCE_VALUES,
      default: WarningSource.DIRECT,
      required: true,
      index: true,
    },
    reportId: { type: String, index: true },
    createdAt: { type: Date, default: () => new Date(), immutable: true, index: true },
    revokedAt: { type: Date },
    revokedBy: { type: String },
    revokeReason: { type: String, trim: true, maxlength: 1000 },
  },
  { collection: "user_warnings", versionKey: false },
);

userWarningSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
userWarningSchema.index({ guildId: 1, userId: 1, status: 1 });

export const UserWarningModel: Model<UserWarning> =
  (mongoose.models.UserWarning as Model<UserWarning> | undefined) ??
  mongoose.model<UserWarning>("UserWarning", userWarningSchema);
