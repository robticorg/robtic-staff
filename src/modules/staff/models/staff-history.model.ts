import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { STAFF_HISTORY_ACTION_VALUES, type StaffHistoryAction } from "../types/enums.ts";

export interface StaffHistory {
  staffId: Types.ObjectId;
  action: StaffHistoryAction;
  previousRoleLevel?: number;
  newRoleLevel?: number;

  performedBy: UserId;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type StaffHistoryDocument = HydratedDocument<StaffHistory>;

const staffHistorySchema = new Schema<StaffHistory>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: STAFF_HISTORY_ACTION_VALUES,
      required: true,
      index: true,
    },
    previousRoleLevel: { type: Number, min: 0 },
    newRoleLevel: { type: Number, min: 0 },
    performedBy: { type: String, required: true },
    reason: { type: String, trim: true, maxlength: 1000 },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "staff_history", versionKey: false },
);

staffHistorySchema.index({ staffId: 1, createdAt: -1 });

export const StaffHistoryModel: Model<StaffHistory> =
  (mongoose.models.StaffHistory as Model<StaffHistory> | undefined) ??
  mongoose.model<StaffHistory>("StaffHistory", staffHistorySchema);
