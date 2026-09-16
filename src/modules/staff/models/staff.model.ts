import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import {
  STAFF_STATUS_VALUES,
  STAFF_TYPE_VALUES,
  StaffStatus,
  type StaffType,
} from "../types/enums.ts";

export interface Staff extends Timestamps {
  userId: UserId;
  guildId: GuildId;
  status: StaffStatus;

  currentRoleLevel: number;

  /**
   * Current Staff Type, for querying — the configured Discord role id stays in
   * RoleConfig, which remains the source of truth for *which* role a type maps
   * to. Null for a normally accepted member.
   */
  staffType?: StaffType | null;

  points: number;

  reportsClaimed: number;
  reportsCompleted: number;
  ticketsClaimed: number;
  ticketsCompleted: number;
  giftClaimsHandled: number;
  warningsIssued: number;
  staffWarningsIssued: number;

  acceptedBy?: UserId;
  acceptedAt?: Date;
  firedBy?: UserId;
  firedAt?: Date;

  /**
   * `!transfer` link between the two records. The source keeps its own history
   * and statistics — these fields only say where the position went (or came
   * from), never that the other user performed the past activity.
   */
  transferredFrom?: Types.ObjectId;
  transferredTo?: Types.ObjectId;
  transferredAt?: Date;
  transferredBy?: UserId;
}

export type StaffDocument = HydratedDocument<Staff>;

const staffSchema = new Schema<Staff>(
  {
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: STAFF_STATUS_VALUES,
      default: StaffStatus.ACTIVE,
      required: true,
      index: true,
    },
    currentRoleLevel: { type: Number, default: 0, min: 0, required: true },
    staffType: { type: String, enum: [...STAFF_TYPE_VALUES, null], default: null },
    points: { type: Number, default: 0, required: true },

    reportsClaimed: { type: Number, default: 0, min: 0, required: true },
    reportsCompleted: { type: Number, default: 0, min: 0, required: true },
    ticketsClaimed: { type: Number, default: 0, min: 0, required: true },
    ticketsCompleted: { type: Number, default: 0, min: 0, required: true },
    giftClaimsHandled: { type: Number, default: 0, min: 0, required: true },
    warningsIssued: { type: Number, default: 0, min: 0, required: true },
    staffWarningsIssued: { type: Number, default: 0, min: 0, required: true },

    acceptedBy: { type: String },
    acceptedAt: { type: Date },
    firedBy: { type: String },
    firedAt: { type: Date },

    transferredFrom: { type: Schema.Types.ObjectId, ref: "Staff" },
    transferredTo: { type: Schema.Types.ObjectId, ref: "Staff" },
    transferredAt: { type: Date },
    transferredBy: { type: String },
  },
  { timestamps: true, collection: "staff" },
);

staffSchema.index({ guildId: 1, userId: 1 }, { unique: true });

staffSchema.index({ guildId: 1, points: -1 });

export const StaffModel: Model<Staff> =
  (mongoose.models.Staff as Model<Staff> | undefined) ??
  mongoose.model<Staff>("Staff", staffSchema);
