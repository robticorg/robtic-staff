import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import {
  STAFF_POINT_TRANSACTION_TYPE_VALUES,
  type StaffPointTransactionType,
} from "../types/enums.ts";

export interface StaffPointTransaction {
  staffId: Types.ObjectId;

  amount: number;
  type: StaffPointTransactionType;

  referenceId?: string;
  reason: string;
  createdAt: Date;
}

export type StaffPointTransactionDocument = HydratedDocument<StaffPointTransaction>;

const staffPointTransactionSchema = new Schema<StaffPointTransaction>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: STAFF_POINT_TRANSACTION_TYPE_VALUES,
      required: true,
      index: true,
    },
    referenceId: { type: String, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "staff_point_transactions", versionKey: false },
);

staffPointTransactionSchema.index({ staffId: 1, createdAt: -1 });
staffPointTransactionSchema.index({ staffId: 1, type: 1, createdAt: -1 });

staffPointTransactionSchema.index(
  { staffId: 1, type: 1, referenceId: 1 },
  {
    unique: true,
    partialFilterExpression: { referenceId: { $type: "string" } },
    name: "uniq_staff_event_award",
  },
);

export const StaffPointTransactionModel: Model<StaffPointTransaction> =
  (mongoose.models.StaffPointTransaction as Model<StaffPointTransaction> | undefined) ??
  mongoose.model<StaffPointTransaction>(
    "StaffPointTransaction",
    staffPointTransactionSchema,
  );
