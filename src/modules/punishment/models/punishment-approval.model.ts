import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  PUNISHMENT_APPROVAL_STATUS_VALUES,
  PunishmentApprovalStatus,
} from "../types/enums.ts";

export interface PunishmentApproval extends Timestamps {
  approvalId: string;
  guildId: GuildId;
  punishmentId: string;
  type: "KICK" | "BAN";
  status: PunishmentApprovalStatus;

  requestedBy: UserId;
  decidedBy?: UserId;
  decisionReason?: string;

  channelId: ChannelId;
  messageId: string;

  decidedAt?: Date;
}

export type PunishmentApprovalDocument = HydratedDocument<PunishmentApproval>;

const schema = new Schema<PunishmentApproval>(
  {
    approvalId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    punishmentId: { type: String, required: true },
    type: { type: String, enum: ["KICK", "BAN"], required: true },
    status: {
      type: String,
      enum: PUNISHMENT_APPROVAL_STATUS_VALUES,
      default: PunishmentApprovalStatus.PENDING,
      required: true,
      index: true,
    },
    requestedBy: { type: String, required: true },
    decidedBy: { type: String },
    decisionReason: { type: String, trim: true, maxlength: 1000 },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    decidedAt: { type: Date },
  },
  { timestamps: true, collection: "punishment_approvals" },
);

schema.index({ messageId: 1 });
schema.index({ punishmentId: 1, createdAt: -1 });
schema.index(
  { punishmentId: 1 },
  {
    name: "one_live_approval_per_punishment",
    unique: true,
    partialFilterExpression: { status: PunishmentApprovalStatus.PENDING },
  },
);

export const PunishmentApprovalModel: Model<PunishmentApproval> =
  (mongoose.models.PunishmentApproval as Model<PunishmentApproval> | undefined) ??
  mongoose.model<PunishmentApproval>("PunishmentApproval", schema);
