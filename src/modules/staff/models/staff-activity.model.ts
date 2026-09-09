import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import { STAFF_ACTIVITY_TYPE_VALUES, type StaffActivityType } from "../types/enums.ts";

export interface StaffActivity {
  staffId: Types.ObjectId;
  type: StaffActivityType;

  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type StaffActivityDocument = HydratedDocument<StaffActivity>;

const staffActivitySchema = new Schema<StaffActivity>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: STAFF_ACTIVITY_TYPE_VALUES,
      required: true,
      index: true,
    },
    referenceId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date(), immutable: true, index: true },
  },
  { collection: "staff_activities", versionKey: false },
);

staffActivitySchema.index({ staffId: 1, createdAt: -1 });
staffActivitySchema.index({ staffId: 1, type: 1, createdAt: -1 });

export const StaffActivityModel: Model<StaffActivity> =
  (mongoose.models.StaffActivity as Model<StaffActivity> | undefined) ??
  mongoose.model<StaffActivity>("StaffActivity", staffActivitySchema);
