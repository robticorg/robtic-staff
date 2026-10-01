import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  LEAD_ASSIGNMENT_STATUS_VALUES,
  LEAD_HOLDER_TYPE_VALUES,
  LeadAssignmentStatus,
  type LeadHolderType,
} from "../types/enums.ts";

export interface LeadAssignment extends Timestamps {
  assignmentId: string;
  guildId: GuildId;
  leadId: string;
  holderType: LeadHolderType;
  holderId: string;
  previousHolderType?: LeadHolderType | null;
  previousHolderId?: string | null;
  assignedBy: UserId;
  assignedAt: Date;
  removedBy?: UserId | null;
  removedAt?: Date | null;
  status: LeadAssignmentStatus;
}

export type LeadAssignmentDocument = HydratedDocument<LeadAssignment>;

const leadAssignmentSchema = new Schema<LeadAssignment>(
  {
    assignmentId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true },
    leadId: { type: String, required: true },
    holderType: { type: String, enum: LEAD_HOLDER_TYPE_VALUES, required: true },
    holderId: { type: String, required: true },
    previousHolderType: { type: String, enum: [...LEAD_HOLDER_TYPE_VALUES, null], default: null },
    previousHolderId: { type: String, default: null },
    assignedBy: { type: String, required: true },
    assignedAt: { type: Date, required: true, default: () => new Date() },
    removedBy: { type: String, default: null },
    removedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: LEAD_ASSIGNMENT_STATUS_VALUES,
      default: LeadAssignmentStatus.ACTIVE,
      required: true,
    },
  },
  { timestamps: true, collection: "lead_assignments" },
);

leadAssignmentSchema.index({ guildId: 1, leadId: 1, assignedAt: -1 });
leadAssignmentSchema.index({ guildId: 1, status: 1 });
leadAssignmentSchema.index(
  { guildId: 1, leadId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: LeadAssignmentStatus.ACTIVE },
    name: "one_active_lead_holder",
  },
);

export const LeadAssignmentModel: Model<LeadAssignment> =
  (mongoose.models.LeadAssignment as Model<LeadAssignment> | undefined) ??
  mongoose.model<LeadAssignment>("LeadAssignment", leadAssignmentSchema);
