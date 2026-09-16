import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";

export const StaffSupportRequestType = {
  STAFF_SUPPORT: "STAFF_SUPPORT",
  DEMISSION_APPLY: "DEMISSION_APPLY",
} as const;
export type StaffSupportRequestType =
  (typeof StaffSupportRequestType)[keyof typeof StaffSupportRequestType];
export const STAFF_SUPPORT_REQUEST_TYPE_VALUES = Object.values(StaffSupportRequestType);

export const StaffSupportRequestStatus = {
  OPEN: "OPEN",
  /** A demission that has been actioned — the applicant was fired. */
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type StaffSupportRequestStatus =
  (typeof StaffSupportRequestStatus)[keyof typeof StaffSupportRequestStatus];
export const STAFF_SUPPORT_REQUEST_STATUS_VALUES = Object.values(StaffSupportRequestStatus);

export interface StaffSupportRequest extends Timestamps {
  requestId: string;
  guildId: GuildId;
  staffId: UserId;
  type: StaffSupportRequestType;
  status: StaffSupportRequestStatus;

  reason: string;

  /** The ticket this request opened, through the ordinary ticket system. */
  ticketId?: string;
  ticketChannelId?: ChannelId;

  /** Where the manager-facing card was posted (the Break requests channel). */
  channelId?: ChannelId;
  messageId?: string;

  /**
   * The applicant's standing when the request was filed. Kept for the audit
   * trail and for rendering — never trusted at decision time, which always
   * re-reads the live hierarchy.
   */
  snapshotLevel?: number;
  snapshotTier?: string;

  handledBy?: UserId;
  handledAt?: Date;
}

export type StaffSupportRequestDocument = HydratedDocument<StaffSupportRequest>;

const schema = new Schema<StaffSupportRequest>(
  {
    requestId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },
    type: { type: String, enum: STAFF_SUPPORT_REQUEST_TYPE_VALUES, required: true },
    status: {
      type: String,
      enum: STAFF_SUPPORT_REQUEST_STATUS_VALUES,
      default: StaffSupportRequestStatus.OPEN,
      required: true,
      index: true,
    },

    reason: { type: String, required: true, trim: true, maxlength: 2000 },

    ticketId: { type: String },
    ticketChannelId: { type: String },

    channelId: { type: String },
    messageId: { type: String },

    snapshotLevel: { type: Number },
    snapshotTier: { type: String },

    handledBy: { type: String },
    handledAt: { type: Date },
  },
  { collection: "staff_support_requests", versionKey: false, timestamps: true },
);

schema.index({ guildId: 1, staffId: 1, type: 1, status: 1 });

export const StaffSupportRequestModel: Model<StaffSupportRequest> =
  (mongoose.models.StaffSupportRequest as Model<StaffSupportRequest> | undefined) ??
  mongoose.model<StaffSupportRequest>("StaffSupportRequest", schema);
