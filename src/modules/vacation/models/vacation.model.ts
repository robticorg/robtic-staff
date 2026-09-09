import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  VACATION_DURATION_UNIT_VALUES,
  VACATION_SOURCE_VALUES,
  VACATION_STATUS_VALUES,
  VACATION_TYPE_VALUES,
  VacationStatus,
  type VacationDurationUnit,
  type VacationSource,
  type VacationType,
} from "../types/enums.ts";

export interface Vacation extends Timestamps {
  vacationId: string;
  guildId: GuildId;
  staffId: UserId;

  type: VacationType;
  status: VacationStatus;
  source: VacationSource;

  reason: string;

  duration: number;
  durationUnit: VacationDurationUnit;

  startsAt: Date;
  endsAt: Date;
  requestedAt: Date;

  approvedBy?: UserId;
  approvedAt?: Date;

  rejectedBy?: UserId;
  rejectedAt?: Date;
  rejectionReason?: string;

  endedBy?: string;
  endedAt?: Date;

  savedRoleIds: RoleId[];
  rolesRestored?: boolean;
  restoreDeferredAt?: Date;

  channelId?: ChannelId;
  messageId?: string;

  isOpen: boolean;

  metadata?: Record<string, unknown>;
}

export type VacationDocument = HydratedDocument<Vacation>;

const vacationSchema = new Schema<Vacation>(
  {
    vacationId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },

    type: { type: String, enum: VACATION_TYPE_VALUES, required: true },
    status: {
      type: String,
      enum: VACATION_STATUS_VALUES,
      default: VacationStatus.PENDING,
      required: true,
      index: true,
    },
    source: { type: String, enum: VACATION_SOURCE_VALUES, required: true },

    reason: { type: String, required: true, trim: true, maxlength: 1500 },

    duration: { type: Number, required: true, min: 1 },
    durationUnit: { type: String, enum: VACATION_DURATION_UNIT_VALUES, required: true },

    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    requestedAt: { type: Date, required: true, default: () => new Date() },

    approvedBy: { type: String },
    approvedAt: { type: Date },

    rejectedBy: { type: String },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },

    endedBy: { type: String },
    endedAt: { type: Date },

    savedRoleIds: { type: [String], default: [] },
    rolesRestored: { type: Boolean },
    restoreDeferredAt: { type: Date },

    channelId: { type: String },
    messageId: { type: String },

    isOpen: { type: Boolean, required: true, default: true },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "vacations" },
);

vacationSchema.index({ guildId: 1, staffId: 1, createdAt: -1 });
vacationSchema.index({ guildId: 1, status: 1 });
vacationSchema.index({ status: 1, endsAt: 1 });
vacationSchema.index(
  { guildId: 1, staffId: 1 },
  {
    name: "one_open_vacation_per_staff",
    unique: true,
    partialFilterExpression: { isOpen: true },
  },
);

export const VacationModel: Model<Vacation> =
  (mongoose.models.Vacation as Model<Vacation> | undefined) ??
  mongoose.model<Vacation>("Vacation", vacationSchema);
