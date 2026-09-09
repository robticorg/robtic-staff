import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import {
  STAFF_WARNING_LEVEL_VALUES,
  STAFF_WARNING_REAL_SOURCE_VALUES,
  STAFF_WARNING_TYPE_VALUES,
  WARNING_STATUS_VALUES,
  StaffWarningType,
  WarningStatus,
  type StaffWarningLevel,
  type StaffWarningRealSource,
} from "../types/enums.ts";

export interface StaffWarning {
  guildId?: GuildId;
  staffId: Types.ObjectId;
  type: StaffWarningType;
  level?: StaffWarningLevel;
  reason: string;

  evidence: string[];
  issuedBy: UserId;
  status: WarningStatus;

  source?: StaffWarningRealSource;
  sourceVerbalWarningIds?: Types.ObjectId[];
  convertedToWarningId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
  removedAt?: Date;
  removedBy?: UserId;
  removalReason?: string;
}

export type StaffWarningDocument = HydratedDocument<StaffWarning>;

const staffWarningSchema = new Schema<StaffWarning>(
  {
    guildId: { type: String, index: true },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: STAFF_WARNING_TYPE_VALUES,
      default: StaffWarningType.REAL,
      required: true,
    },
    level: { type: Number, enum: STAFF_WARNING_LEVEL_VALUES },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    evidence: { type: [String], default: [] },
    issuedBy: { type: String, required: true },
    status: {
      type: String,
      enum: WARNING_STATUS_VALUES,
      default: WarningStatus.ACTIVE,
      required: true,
      index: true,
    },

    source: { type: String, enum: STAFF_WARNING_REAL_SOURCE_VALUES },
    sourceVerbalWarningIds: { type: [Schema.Types.ObjectId], default: undefined },
    convertedToWarningId: { type: Schema.Types.ObjectId },

    removedAt: { type: Date },
    removedBy: { type: String },
    removalReason: { type: String, trim: true, maxlength: 1000 },
  },
  { collection: "staff_warnings", versionKey: false, timestamps: true },
);

staffWarningSchema.index({ staffId: 1, status: 1, createdAt: -1 });
staffWarningSchema.index({ staffId: 1, type: 1, status: 1, createdAt: 1 });

export const StaffWarningModel: Model<StaffWarning> =
  (mongoose.models.StaffWarning as Model<StaffWarning> | undefined) ??
  mongoose.model<StaffWarning>("StaffWarning", staffWarningSchema);
