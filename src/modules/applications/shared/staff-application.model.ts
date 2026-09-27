import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  APPLICANT_GENDER_VALUES,
  APPLICATION_DEPARTMENT_VALUES,
  APPLICATION_STATUS_VALUES,
  APPLICATION_TYPE_VALUES,
  ApplicationStatus,
  GIRL_VERIFICATION_STATUS_VALUES,
  type ApplicantGender,
  type ApplicationDepartment,
  type ApplicationType,
  type GirlVerificationStatus,
} from "./enums.ts";

export interface TransferSource {
  sourceServerId: string | null;
  sourceServerName: string | null;
  sourceServerMemberCount: number;
  sourceServerOnlineCount: number;
  sourceRoleOrder: number;
  sourceRoleName: string | null;
  sourceRoleId: string | null;
  countsVerified: boolean;
}

export interface TransferEvaluationSnapshot {
  eligible: boolean;
  ineligibleReasons: string[];
  sourceTier: string;
  proposedTier: string | null;
  proposedStaffLevel: number | null;
  proposedStaffRoleId: RoleId | null;
}

export interface RecruiterReplacement {
  previousRecruiterStaffId: UserId;
  replacedBy: UserId;
  replacedAt: Date;
}

export interface StaffApplication extends Timestamps {
  applicationId: string;
  guildId: GuildId;
  userId: UserId;
  ticketId: string | null;
  type: ApplicationType;
  applicationStatus: ApplicationStatus;

  name: string;
  age: number;
  city: string;
  termsAccepted: boolean;

  gender: ApplicantGender | null;
  department: ApplicationDepartment | null;
  girlVerification: GirlVerificationStatus | null;
  girlVerifiedBy?: UserId;
  girlVerifiedAt?: Date;

  transfer: TransferSource | null;
  evaluation: TransferEvaluationSnapshot | null;
  evidenceCount: number;

  robticJoinedAt: Date | null;

  recruiterStaffId: UserId | null;
  recruiterAssignedAt?: Date;
  recruiterAssignedBy?: UserId;
  recruiterReplacements: RecruiterReplacement[];

  panelMessageId?: string;

  acceptedBy?: UserId;
  acceptedAt?: Date;
  acceptedLevel?: number;
  rejectedBy?: UserId;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export type StaffApplicationDocument = HydratedDocument<StaffApplication>;

const transferSchema = new Schema<TransferSource>(
  {
    sourceServerId: { type: String, default: null },
    sourceServerName: { type: String, default: null },
    sourceServerMemberCount: { type: Number, required: true, min: 0 },
    sourceServerOnlineCount: { type: Number, required: true, min: 0 },
    sourceRoleOrder: { type: Number, required: true, min: 1 },
    sourceRoleName: { type: String, default: null },
    sourceRoleId: { type: String, default: null },
    countsVerified: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const evaluationSchema = new Schema<TransferEvaluationSnapshot>(
  {
    eligible: { type: Boolean, required: true },
    ineligibleReasons: { type: [String], default: [] },
    sourceTier: { type: String, required: true },
    proposedTier: { type: String, default: null },
    proposedStaffLevel: { type: Number, default: null },
    proposedStaffRoleId: { type: String, default: null },
  },
  { _id: false },
);

const replacementSchema = new Schema<RecruiterReplacement>(
  {
    previousRecruiterStaffId: { type: String, required: true },
    replacedBy: { type: String, required: true },
    replacedAt: { type: Date, required: true },
  },
  { _id: false },
);

const schema = new Schema<StaffApplication>(
  {
    applicationId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    ticketId: { type: String, default: null },
    type: { type: String, enum: APPLICATION_TYPE_VALUES, required: true },
    applicationStatus: {
      type: String,
      enum: APPLICATION_STATUS_VALUES,
      default: ApplicationStatus.PENDING,
      required: true,
      index: true,
    },

    name: { type: String, required: true, maxlength: 100 },
    age: { type: Number, required: true, min: 0 },
    city: { type: String, required: true, maxlength: 100 },
    termsAccepted: { type: Boolean, required: true },

    gender: { type: String, enum: [...APPLICANT_GENDER_VALUES, null], default: null },
    department: { type: String, enum: [...APPLICATION_DEPARTMENT_VALUES, null], default: null },
    girlVerification: {
      type: String,
      enum: [...GIRL_VERIFICATION_STATUS_VALUES, null],
      default: null,
    },
    girlVerifiedBy: { type: String },
    girlVerifiedAt: { type: Date },

    transfer: { type: transferSchema, default: null },
    evaluation: { type: evaluationSchema, default: null },
    evidenceCount: { type: Number, default: 0, min: 0 },

    robticJoinedAt: { type: Date, default: null },

    recruiterStaffId: { type: String, default: null },
    recruiterAssignedAt: { type: Date },
    recruiterAssignedBy: { type: String },
    recruiterReplacements: { type: [replacementSchema], default: [] },

    panelMessageId: { type: String },

    acceptedBy: { type: String },
    acceptedAt: { type: Date },
    acceptedLevel: { type: Number },
    rejectedBy: { type: String },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 1000 },
  },
  { collection: "staff_applications", versionKey: false, timestamps: true },
);

schema.index({ guildId: 1, ticketId: 1 });
schema.index({ guildId: 1, userId: 1, applicationStatus: 1 });
schema.index({ guildId: 1, recruiterStaffId: 1 });

export const StaffApplicationModel: Model<StaffApplication> =
  (mongoose.models.StaffApplication as Model<StaffApplication> | undefined) ??
  mongoose.model<StaffApplication>("StaffApplication", schema);
