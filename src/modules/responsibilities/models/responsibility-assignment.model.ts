import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  RESPONSIBILITY_ASSIGNMENT_STATUS_VALUES,
  ResponsibilityAssignmentStatus,
} from "../types/enums.ts";

export interface ResponsibilityAssignment extends Timestamps {
  assignmentId: string;
  guildId: GuildId;
  responsibilityId: string;
  userId: UserId;
  roleId: RoleId;
  roleGranted: boolean;
  assignedBy: UserId;
  assignedAt: Date;
  expiresAt?: Date | null;
  removedBy?: UserId | null;
  removedAt?: Date | null;
  status: ResponsibilityAssignmentStatus;
}

export type ResponsibilityAssignmentDocument = HydratedDocument<ResponsibilityAssignment>;

const assignmentSchema = new Schema<ResponsibilityAssignment>(
  {
    assignmentId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true },
    responsibilityId: { type: String, required: true },
    userId: { type: String, required: true },
    roleId: { type: String, required: true },
    roleGranted: { type: Boolean, required: true, default: true },
    assignedBy: { type: String, required: true },
    assignedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, default: null },
    removedBy: { type: String, default: null },
    removedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: RESPONSIBILITY_ASSIGNMENT_STATUS_VALUES,
      default: ResponsibilityAssignmentStatus.ACTIVE,
      required: true,
    },
  },
  { timestamps: true, collection: "responsibility_assignments" },
);

assignmentSchema.index({ guildId: 1, userId: 1, status: 1 });
assignmentSchema.index({ status: 1, expiresAt: 1 });
assignmentSchema.index(
  { guildId: 1, userId: 1, responsibilityId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ResponsibilityAssignmentStatus.ACTIVE },
    name: "one_active_assignment",
  },
);

export const ResponsibilityAssignmentModel: Model<ResponsibilityAssignment> =
  (mongoose.models.ResponsibilityAssignment as Model<ResponsibilityAssignment> | undefined) ??
  mongoose.model<ResponsibilityAssignment>("ResponsibilityAssignment", assignmentSchema);
