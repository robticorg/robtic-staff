import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { TICKET_STATUS_VALUES, TicketStatus } from "../types/enums.ts";

export interface TicketAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface TicketClaimableRole {
  roleId: RoleId;
  messageId?: string;
  claimedBy?: UserId;
  claimedAt?: Date;
  closed?: boolean;
}

/** One line of a ticket's history, shown by !ticket. */
export interface TicketEvent {
  /** A TicketLogAction, or "COMMAND" for a command typed in the ticket. */
  action: string;
  actorId: UserId;
  targetId?: UserId;
  /** The command as typed, a new name, a reason… */
  detail?: string;
  at: Date;
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

  claimableRoles: TicketClaimableRole[];

  transferredFrom?: UserId;
  transferredAt?: Date;
  transferReason?: string;

  sleepDueAt?: Date;
  sleepStartedBy?: UserId;
  sleepStartedAt?: Date;
  sleepDurationMs?: number;

  claimedAt?: Date;
  /** Who claimed it first and when — kept through handovers (claimedAt moves on handover). */
  firstClaimedByDiscordId?: UserId;
  firstClaimedAt?: Date;
  closedAt?: Date;
  closedBy?: UserId;
  reopenedAt?: Date;
  reopenedBy?: UserId;
  deletedAt?: Date;
  deletedBy?: UserId;

  /** Set once, the first time the ticket is completed — reopening never re-awards the credit. */
  completionCreditedAt?: Date;

  transcriptId?: string;
  /** Newest last, capped (see TICKET_EVENT_CAP). */
  events: TicketEvent[];
  metadata?: Record<string, unknown>;
}

export const TICKET_EVENT_CAP = 100;

export type TicketDocument = HydratedDocument<Ticket>;

const answerSchema = new Schema<TicketAnswer>(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true, default: "" },
  },
  { _id: false },
);

const claimableRoleSchema = new Schema<TicketClaimableRole>(
  {
    roleId: { type: String, required: true },
    messageId: { type: String },
    claimedBy: { type: String },
    claimedAt: { type: Date },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const eventSchema = new Schema<TicketEvent>(
  {
    action: { type: String, required: true },
    actorId: { type: String, required: true },
    targetId: { type: String },
    detail: { type: String, maxlength: 300 },
    at: { type: Date, required: true },
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

    claimableRoles: { type: [claimableRoleSchema], default: [] },

    transferredFrom: { type: String },
    transferredAt: { type: Date },
    transferReason: { type: String },

    sleepDueAt: { type: Date },
    sleepStartedBy: { type: String },
    sleepStartedAt: { type: Date },
    sleepDurationMs: { type: Number },

    claimedAt: { type: Date },
    firstClaimedByDiscordId: { type: String },
    firstClaimedAt: { type: Date },
    closedAt: { type: Date },
    closedBy: { type: String },
    reopenedAt: { type: Date },
    reopenedBy: { type: String },
    deletedAt: { type: Date },
    deletedBy: { type: String },

    completionCreditedAt: { type: Date },

    transcriptId: { type: String },
    events: { type: [eventSchema], default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "tickets" },
);

ticketSchema.index({ guildId: 1, userId: 1, status: 1 });
ticketSchema.index({ guildId: 1, panelId: 1, createdAt: -1 });
ticketSchema.index({ guildId: 1, claimedBy: 1, claimedAt: -1 });
ticketSchema.index({ guildId: 1, claimedBy: 1, status: 1 });

ticketSchema.index({ sleepDueAt: 1, status: 1 });

export const TicketModel: Model<Ticket> =
  (mongoose.models.Ticket as Model<Ticket> | undefined) ??
  mongoose.model<Ticket>("Ticket", ticketSchema);
