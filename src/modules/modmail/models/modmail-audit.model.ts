import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import {
  MODMAIL_ACTOR_TYPE_VALUES,
  MODMAIL_AUDIT_ACTION_VALUES,
  ModmailActorType,
  type ModmailAuditAction,
} from "../types/enums.ts";

export interface ModmailAudit {
  caseId: string;
  action: ModmailAuditAction;
  actorType: ModmailActorType;

  actorId?: UserId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type ModmailAuditDocument = HydratedDocument<ModmailAudit>;

const modmailAuditSchema = new Schema<ModmailAudit>(
  {
    caseId: { type: String, required: true, index: true },
    action: { type: String, enum: MODMAIL_AUDIT_ACTION_VALUES, required: true },
    actorType: {
      type: String,
      enum: MODMAIL_ACTOR_TYPE_VALUES,
      default: ModmailActorType.SYSTEM,
      required: true,
    },
    actorId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "modmail_audit", versionKey: false },
);

modmailAuditSchema.index({ caseId: 1, createdAt: 1 });

export const ModmailAuditModel: Model<ModmailAudit> =
  (mongoose.models.ModmailAudit as Model<ModmailAudit> | undefined) ??
  mongoose.model<ModmailAudit>("ModmailAudit", modmailAuditSchema);
