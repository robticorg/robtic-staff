import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { TICKET_STATUS_VALUES, TicketStatus } from "../types/enums.ts";

export interface TicketAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface Ticket extends Timestamps {
  ticketId: string;
  guildId: GuildId;
  channelId: ChannelId;
  userId: UserId;

  panelId: string;

  claimedBy?: Types.ObjectId;
  claimedByDiscordId?: UserId;

  status: TicketStatus;
  answers: TicketAnswer[];

  addedUsers: UserId[];
  addedRoles: RoleId[];

  claimedAt?: Date;
  closedAt?: Date;
  closedBy?: UserId;
  deletedAt?: Date;
  deletedBy?: UserId;

  transcriptId?: string;
  metadata?: Record<string, unknown>;
}

export type TicketDocument = HydratedDocument<Ticket>;

const answerSchema = new Schema<TicketAnswer>(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true, default: "" },
  },
  { _id: false },
);

const ticketSchema = new Schema<Ticket>(
  {
    ticketId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    panelId: { type: String, required: true, index: true },

    claimedBy: { type: Schema.Types.ObjectId, ref: "Staff", index: true },
    claimedByDiscordId: { type: String },

    status: {
      type: String,
      enum: TICKET_STATUS_VALUES,
      default: TicketStatus.OPEN,
      required: true,
      index: true,
    },
    answers: { type: [answerSchema], default: [] },

    addedUsers: { type: [String], default: [] },
    addedRoles: { type: [String], default: [] },

    claimedAt: { type: Date },
    closedAt: { type: Date },
    closedBy: { type: String },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    transcriptId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "tickets" },
);

ticketSchema.index({ guildId: 1, userId: 1, status: 1 });
ticketSchema.index({ guildId: 1, panelId: 1, createdAt: -1 });
ticketSchema.index({ guildId: 1, claimedBy: 1, claimedAt: -1 });
ticketSchema.index({ guildId: 1, claimedBy: 1, status: 1 });

export const TicketModel: Model<Ticket> =
  (mongoose.models.Ticket as Model<Ticket> | undefined) ??
  mongoose.model<Ticket>("Ticket", ticketSchema);
