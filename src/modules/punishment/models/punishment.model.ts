import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  PUNISHMENT_STATUS_VALUES,
  PUNISHMENT_TYPE_VALUES,
  PunishmentStatus,
  PunishmentType,
} from "../types/enums.ts";

export interface Punishment extends Timestamps {
  punishmentId: string;
  guildId: GuildId;
  userId: UserId;
  type: PunishmentType;
  status: PunishmentStatus;

  reason: string;
  evidence: string[];

  reportId?: string;

  issuedBy: UserId;
  approvedBy?: UserId;
  executedBy?: UserId;
  rejectionReason?: string;

  duration?: number;
  expiresAt?: Date;

  executedAt?: Date;
  revokedAt?: Date;
  revokedBy?: UserId;
  revocationReason?: string;
  appealId?: string;

  failureReason?: string;

  evidenceAvailableUntil?: Date;

  metadata?: Record<string, unknown>;
}

export type PunishmentDocument = HydratedDocument<Punishment>;

const punishmentSchema = new Schema<Punishment>(
  {
    punishmentId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: PUNISHMENT_TYPE_VALUES, required: true, index: true },
    status: {
      type: String,
      enum: PUNISHMENT_STATUS_VALUES,
      default: PunishmentStatus.PENDING,
      required: true,
      index: true,
    },

    reason: {
      type: String,
      required(this: Punishment) {
        return this.type !== PunishmentType.NO_ACTION;
      },
      trim: true,
      maxlength: 2000,
    },
    evidence: { type: [String], default: [] },

    reportId: { type: String, index: true },

    issuedBy: { type: String, required: true },
    approvedBy: { type: String },
    executedBy: { type: String },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },

    duration: { type: Number, min: 0 },
    expiresAt: { type: Date },

    executedAt: { type: Date },
    revokedAt: { type: Date },
    revokedBy: { type: String },
    revocationReason: { type: String, trim: true, maxlength: 2000 },
    appealId: { type: String, index: true },

    failureReason: { type: String, trim: true, maxlength: 2000 },
    evidenceAvailableUntil: { type: Date },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "punishments" },
);

punishmentSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
punishmentSchema.index({ status: 1, expiresAt: 1 });

export const PunishmentModel: Model<Punishment> =
  (mongoose.models.Punishment as Model<Punishment> | undefined) ??
  mongoose.model<Punishment>("Punishment", punishmentSchema);
