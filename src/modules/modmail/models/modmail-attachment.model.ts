import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import {
  ATTACHMENT_STORAGE_KIND_VALUES,
  AttachmentStorageKind,
} from "../types/enums.ts";

export interface ModmailAttachment {
  caseId: string;
  messageId?: Types.ObjectId;
  storage: AttachmentStorageKind;
  url: string;
  filename: string;
  contentType?: string;
  size?: number;

  attachmentId: string;
  uploadedBy: UserId;
  createdAt: Date;
}

export type ModmailAttachmentDocument = HydratedDocument<ModmailAttachment>;

const modmailAttachmentSchema = new Schema<ModmailAttachment>(
  {
    caseId: { type: String, required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: "ModmailMessage", index: true },
    storage: {
      type: String,
      enum: ATTACHMENT_STORAGE_KIND_VALUES,
      default: AttachmentStorageKind.DISCORD_CDN,
      required: true,
    },
    url: { type: String, required: true },
    filename: { type: String, required: true },
    contentType: { type: String },
    size: { type: Number, min: 0 },
    attachmentId: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "modmail_attachments", versionKey: false },
);

modmailAttachmentSchema.index({ caseId: 1, createdAt: 1 });

export const ModmailAttachmentModel: Model<ModmailAttachment> =
  (mongoose.models.ModmailAttachment as Model<ModmailAttachment> | undefined) ??
  mongoose.model<ModmailAttachment>("ModmailAttachment", modmailAttachmentSchema);
