import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";

export interface ApplicationEvidence extends Timestamps {
  applicationId: string;
  guildId: GuildId;
  uploadedBy: UserId;
  position: number;
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export type ApplicationEvidenceDocument = HydratedDocument<ApplicationEvidence>;

const schema = new Schema<ApplicationEvidence>(
  {
    applicationId: { type: String, required: true, index: true },
    guildId: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    position: { type: Number, required: true, min: 0 },
    filename: { type: String, required: true, maxlength: 200 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    data: { type: Buffer, required: true },
  },
  { collection: "staff_application_evidence", versionKey: false, timestamps: true },
);

schema.index({ applicationId: 1, position: 1 }, { unique: true });

export const ApplicationEvidenceModel: Model<ApplicationEvidence> =
  (mongoose.models.ApplicationEvidence as Model<ApplicationEvidence> | undefined) ??
  mongoose.model<ApplicationEvidence>("ApplicationEvidence", schema);
