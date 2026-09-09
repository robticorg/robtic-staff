import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { PUNISHMENT_AUDIT_ACTION_VALUES, type PunishmentAuditAction } from "../types/enums.ts";

export interface PunishmentAudit {
  punishmentId: string;
  action: PunishmentAuditAction;
  actorId?: UserId;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type PunishmentAuditDocument = HydratedDocument<PunishmentAudit>;

const schema = new Schema<PunishmentAudit>(
  {
    punishmentId: { type: String, required: true, index: true },
    action: { type: String, enum: PUNISHMENT_AUDIT_ACTION_VALUES, required: true },
    actorId: { type: String },
    error: { type: String, maxlength: 4000 },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "punishment_audit", versionKey: false },
);

schema.index({ punishmentId: 1, createdAt: 1 });

export const PunishmentAuditModel: Model<PunishmentAudit> =
  (mongoose.models.PunishmentAudit as Model<PunishmentAudit> | undefined) ??
  mongoose.model<PunishmentAudit>("PunishmentAudit", schema);
