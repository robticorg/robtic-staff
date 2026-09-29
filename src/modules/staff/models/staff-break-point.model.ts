import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { GuildId } from "../../../shared/types/index.ts";
import {
  STAFF_POINT_TRANSACTION_TYPE_VALUES,
  type StaffPointTransactionType,
} from "../types/enums.ts";

/**
 * Points earned while on break. Kept in their own collection on purpose: every
 * total, leaderboard and the staff `points` balance sums staff_point_transactions,
 * so nothing here can ever leak into those numbers.
 */
export interface StaffBreakPoint {
  staffId: Types.ObjectId;
  guildId: GuildId;

  amount: number;
  type: StaffPointTransactionType;

  referenceId?: string;
  reason: string;
  createdAt: Date;
}

const staffBreakPointSchema = new Schema<StaffBreakPoint>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    guildId: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: STAFF_POINT_TRANSACTION_TYPE_VALUES, required: true },
    referenceId: { type: String },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "staff_break_points", versionKey: false },
);

staffBreakPointSchema.index({ staffId: 1, createdAt: -1 });
staffBreakPointSchema.index(
  { staffId: 1, referenceId: 1 },
  {
    unique: true,
    partialFilterExpression: { referenceId: { $type: "string" } },
    name: "uniq_staff_break_award",
  },
);

export const StaffBreakPointModel: Model<StaffBreakPoint> =
  (mongoose.models.StaffBreakPoint as Model<StaffBreakPoint> | undefined) ??
  mongoose.model<StaffBreakPoint>("StaffBreakPoint", staffBreakPointSchema);
