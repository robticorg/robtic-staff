import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import {
  MODMAIL_CASE_STATUS_VALUES,
  MODMAIL_CASE_TYPE_VALUES,
  ModmailCaseStatus,
  type ModmailCaseType,
} from "../types/enums.ts";

export interface ModmailCase extends Timestamps {
  caseId: string;
  guildId: GuildId;

  userId: UserId;
  type: ModmailCaseType;
  status: ModmailCaseStatus;
  reportedUserId: UserId;

  claimedBy?: Types.ObjectId;

  claimedByDiscordId?: UserId;

  threadId?: string;
  reportMessageId?: string;

  reason?: string;
  description?: string;

  evidenceCount: number;

  claimedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  closedByDiscordId?: UserId;
  resolutionNote?: string;

  resolutionType?: string;
  punishmentId?: string;
  resolvedBy?: UserId;

  metadata?: Record<string, unknown>;
}

export type ModmailCaseDocument = HydratedDocument<ModmailCase>;

const modmailCaseSchema = new Schema<ModmailCase>(
  {
    caseId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    type: { type: String, enum: MODMAIL_CASE_TYPE_VALUES, required: true, index: true },
    status: {
      type: String,
      enum: MODMAIL_CASE_STATUS_VALUES,
      default: ModmailCaseStatus.PENDING,
      required: true,
      index: true,
    },
    reportedUserId: { type: String, required: true, index: true },

    claimedBy: { type: Schema.Types.ObjectId, ref: "Staff", index: true },
    claimedByDiscordId: { type: String },

    threadId: { type: String, index: true, sparse: true },
    reportMessageId: { type: String },

    reason: { type: String, trim: true, maxlength: 1000 },
    description: { type: String, trim: true, maxlength: 4000 },
    evidenceCount: { type: Number, default: 0, min: 0, required: true },

    claimedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    closedByDiscordId: { type: String },
    resolutionNote: { type: String, trim: true, maxlength: 2000 },

    resolutionType: { type: String },
    punishmentId: { type: String, index: true },
    resolvedBy: { type: String },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "modmail_cases" },
);

modmailCaseSchema.index({ guildId: 1, userId: 1, status: 1 });

modmailCaseSchema.index({ guildId: 1, status: 1, createdAt: -1 });

export const ModmailCaseModel: Model<ModmailCase> =
  (mongoose.models.ModmailCase as Model<ModmailCase> | undefined) ??
  mongoose.model<ModmailCase>("ModmailCase", modmailCaseSchema);
