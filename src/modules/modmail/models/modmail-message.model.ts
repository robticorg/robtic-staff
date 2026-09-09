import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { MODMAIL_SENDER_TYPE_VALUES, type ModmailSenderType } from "../types/enums.ts";

export interface ModmailMessage {
  caseId: string;
  senderType: ModmailSenderType;

  senderId?: UserId;
  content: string;
  attachments: Types.ObjectId[];

  internal: boolean;

  sourceMessageId?: string;

  relayedMessageId?: string;
  createdAt: Date;
}

export type ModmailMessageDocument = HydratedDocument<ModmailMessage>;

const modmailMessageSchema = new Schema<ModmailMessage>(
  {
    caseId: { type: String, required: true, index: true },
    senderType: { type: String, enum: MODMAIL_SENDER_TYPE_VALUES, required: true },
    senderId: { type: String },
    content: { type: String, default: "" },
    attachments: { type: [Schema.Types.ObjectId], ref: "ModmailAttachment", default: [] },
    internal: { type: Boolean, default: false, required: true },
    sourceMessageId: { type: String },
    relayedMessageId: { type: String },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "modmail_messages", versionKey: false },
);

modmailMessageSchema.index({ caseId: 1, createdAt: 1 });

modmailMessageSchema.index(
  { sourceMessageId: 1 },
  { unique: true, partialFilterExpression: { sourceMessageId: { $type: "string" } } },
);

export const ModmailMessageModel: Model<ModmailMessage> =
  (mongoose.models.ModmailMessage as Model<ModmailMessage> | undefined) ??
  mongoose.model<ModmailMessage>("ModmailMessage", modmailMessageSchema);
