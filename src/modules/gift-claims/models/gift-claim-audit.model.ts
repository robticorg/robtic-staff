import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { GIFT_CLAIM_AUDIT_ACTION_VALUES, type GiftClaimAuditAction } from "../types/enums.ts";

export interface GiftClaimAudit {
  claimId: string;
  guildId?: GuildId;
  action: GiftClaimAuditAction;
  actorId?: UserId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type GiftClaimAuditDocument = HydratedDocument<GiftClaimAudit>;

const schema = new Schema<GiftClaimAudit>(
  {
    claimId: { type: String, required: true, index: true },
    guildId: { type: String, index: true },
    action: { type: String, enum: GIFT_CLAIM_AUDIT_ACTION_VALUES, required: true },
    actorId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "gift_claim_audits", versionKey: false },
);

schema.index({ claimId: 1, createdAt: 1 });
schema.index({ guildId: 1, actorId: 1, action: 1, createdAt: 1 });

export const GiftClaimAuditModel: Model<GiftClaimAudit> =
  (mongoose.models.GiftClaimAudit as Model<GiftClaimAudit> | undefined) ??
  mongoose.model<GiftClaimAudit>("GiftClaimAudit", schema);
