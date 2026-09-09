import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import { TranscriptFormat } from "../types/enums.ts";

export interface TicketTranscript {
  transcriptId: string;
  ticketId: string;
  guildId: GuildId;
  format: TranscriptFormat;

  content: string;
  messageCount: number;
  createdAt: Date;
}

export type TicketTranscriptDocument = HydratedDocument<TicketTranscript>;

const schema = new Schema<TicketTranscript>(
  {
    transcriptId: { type: String, required: true, unique: true, default: () => shortId(8) },
    ticketId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    format: { type: String, enum: Object.values(TranscriptFormat), default: TranscriptFormat.JSON, required: true },
    content: { type: String, required: true },
    messageCount: { type: Number, default: 0, min: 0, required: true },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "ticket_transcripts", versionKey: false },
);

export const TicketTranscriptModel: Model<TicketTranscript> =
  (mongoose.models.TicketTranscript as Model<TicketTranscript> | undefined) ??
  mongoose.model<TicketTranscript>("TicketTranscript", schema);
