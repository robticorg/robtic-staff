import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import { APPEAL_STATUS_VALUES, AppealStatus } from "../types/enums.ts";

export interface Appeal extends Timestamps {
  appealId: string;
  guildId: GuildId;
  userId: UserId;
  punishmentId: string;

  reason: string;
  evidence: string[];

  status: AppealStatus;
  submittedAt: Date;

  claimedBy?: UserId;
  claimedAt?: Date;

  reviewedBy?: UserId;
  reviewedAt?: Date;
  decisionReason?: string;

  channelId?: ChannelId;
  messageId?: string;

  penaltyAppliedAt?: Date;
  penaltyTransactionId?: Types.ObjectId;

  reversalError?: string;

  metadata?: Record<string, unknown>;
}

export type AppealDocument = HydratedDocument<Appeal>;

const appealSchema = new Schema<Appeal>(
  {
    appealId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    punishmentId: { type: String, required: true },

    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    evidence: { type: [String], default: [] },

    status: {
      type: String,
      enum: APPEAL_STATUS_VALUES,
      default: AppealStatus.PENDING,
      required: true,
      index: true,
    },
    submittedAt: { type: Date, required: true, default: () => new Date() },

    claimedBy: { type: String },
    claimedAt: { type: Date },

    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    decisionReason: { type: String, trim: true, maxlength: 2000 },

    channelId: { type: String },
    messageId: { type: String },

    penaltyAppliedAt: { type: Date },
    penaltyTransactionId: { type: Schema.Types.ObjectId, ref: "StaffPointTransaction" },

    reversalError: { type: String, trim: true, maxlength: 2000 },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "appeals" },
);

appealSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
appealSchema.index({ status: 1, createdAt: -1 });
appealSchema.index({ messageId: 1 });
appealSchema.index({ punishmentId: 1 }, { unique: true, name: "uniq_appeal_per_punishment" });

export const AppealModel: Model<Appeal> =
  (mongoose.models.Appeal as Model<Appeal> | undefined) ??
  mongoose.model<Appeal>("Appeal", appealSchema);
