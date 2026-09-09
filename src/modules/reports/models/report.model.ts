import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  REPORT_STATUS_VALUES,
  REPORT_TYPE_VALUES,
  ReportStatus,
  type ReportType,
} from "../types/enums.ts";

export interface Report {
  reportId: string;
  guildId: GuildId;
  type: ReportType;
  reporterId: UserId;
  reportedUserId: UserId;
  claimedBy?: Types.ObjectId;
  status: ReportStatus;
  createdAt: Date;
  claimedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export type ReportDocument = HydratedDocument<Report>;

const reportSchema = new Schema<Report>(
  {
    reportId: { type: String, required: true, unique: true, default: () => shortId() },
    guildId: { type: String, required: true, index: true },
    type: { type: String, enum: REPORT_TYPE_VALUES, required: true, index: true },
    reporterId: { type: String, required: true },
    reportedUserId: { type: String, required: true, index: true },
    claimedBy: { type: Schema.Types.ObjectId, ref: "Staff", index: true },
    status: {
      type: String,
      enum: REPORT_STATUS_VALUES,
      default: ReportStatus.PENDING,
      required: true,
      index: true,
    },
    claimedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true, collection: "reports" },
);

reportSchema.index({ guildId: 1, status: 1, createdAt: -1 });
reportSchema.index({ guildId: 1, reportedUserId: 1, createdAt: -1 });
reportSchema.index({ guildId: 1, claimedBy: 1, claimedAt: -1 });
reportSchema.index({ guildId: 1, claimedBy: 1, status: 1 });

export const ReportModel: Model<Report> =
  (mongoose.models.Report as Model<Report> | undefined) ??
  mongoose.model<Report>("Report", reportSchema);
