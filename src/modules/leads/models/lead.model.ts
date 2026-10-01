import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import { LEAD_TARGET_TYPE_VALUES, type LeadTargetType } from "../types/enums.ts";

export interface Lead extends Timestamps {
  leadId: string;
  guildId: GuildId;
  name: string;
  description: string;
  targetType: LeadTargetType;
  targetId: string;
  createdBy: UserId;
}

export type LeadDocument = HydratedDocument<Lead>;

const leadSchema = new Schema<Lead>(
  {
    leadId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    targetType: { type: String, enum: LEAD_TARGET_TYPE_VALUES, required: true },
    targetId: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: "leads" },
);

leadSchema.index({ guildId: 1, name: 1 }, { unique: true });
leadSchema.index({ guildId: 1, targetType: 1, targetId: 1 });

export const LeadModel: Model<Lead> =
  (mongoose.models.Lead as Model<Lead> | undefined) ?? mongoose.model<Lead>("Lead", leadSchema);
