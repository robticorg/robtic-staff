import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  STAFF_OFF_DUTY_REASON_VALUES,
  type StaffOffDutyReason,
} from "../../staff/services/staff-duty-events.ts";

export const TicketClaimCheckStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  DONE: "DONE",
} as const;
export type TicketClaimCheckStatus = (typeof TicketClaimCheckStatus)[keyof typeof TicketClaimCheckStatus];

export interface TicketClaimCheck extends Timestamps {
  checkId: string;
  guildId: GuildId;
  userId: UserId;
  actorId: string;
  reason: StaffOffDutyReason;
  dueAt: Date;
  status: TicketClaimCheckStatus;
  outcome?: string;
}

export type TicketClaimCheckDocument = HydratedDocument<TicketClaimCheck>;

const ticketClaimCheckSchema = new Schema<TicketClaimCheck>(
  {
    checkId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    actorId: { type: String, required: true },
    reason: { type: String, enum: STAFF_OFF_DUTY_REASON_VALUES, required: true },
    dueAt: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(TicketClaimCheckStatus),
      default: TicketClaimCheckStatus.PENDING,
      required: true,
    },
    outcome: { type: String },
  },
  { timestamps: true, collection: "ticket_claim_checks" },
);

ticketClaimCheckSchema.index(
  { guildId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: TicketClaimCheckStatus.PENDING } },
);
ticketClaimCheckSchema.index({ status: 1, dueAt: 1 });

export const TicketClaimCheckModel: Model<TicketClaimCheck> =
  (mongoose.models.TicketClaimCheck as Model<TicketClaimCheck> | undefined) ??
  mongoose.model<TicketClaimCheck>("TicketClaimCheck", ticketClaimCheckSchema);
