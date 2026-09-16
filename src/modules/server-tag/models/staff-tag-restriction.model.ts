import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import {
  STAFF_TAG_RESTORATION_REASON_VALUES,
  STAFF_TAG_RESTRICTION_STATUS_VALUES,
  StaffTagRestrictionStatus,
  type StaffTagRestorationReason,
} from "../types/enums.ts";

export interface StaffTagRestriction extends Timestamps {
  restrictionId: string;
  guildId: GuildId;
  staffId: UserId;

  savedRoleIds: RoleId[];

  startedAt: Date;
  expiresAt: Date;

  status: StaffTagRestrictionStatus;

  isActive: boolean;

  restoredAt?: Date;
  restoredBy?: string;
  restorationReason?: StaffTagRestorationReason;

  rolesRestored?: boolean;

  missingRoleIds?: RoleId[];

  metadata?: Record<string, unknown>;
}

export type StaffTagRestrictionDocument = HydratedDocument<StaffTagRestriction>;

const staffTagRestrictionSchema = new Schema<StaffTagRestriction>(
  {
    restrictionId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },

    savedRoleIds: { type: [String], default: [] },

    startedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },

    status: {
      type: String,
      enum: STAFF_TAG_RESTRICTION_STATUS_VALUES,
      default: StaffTagRestrictionStatus.ACTIVE,
      required: true,
      index: true,
    },
    isActive: { type: Boolean, required: true, default: true },

    restoredAt: { type: Date },
    restoredBy: { type: String },
    restorationReason: { type: String, enum: STAFF_TAG_RESTORATION_REASON_VALUES },

    rolesRestored: { type: Boolean },
    missingRoleIds: { type: [String], default: undefined },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "staff_tag_restrictions" },
);

staffTagRestrictionSchema.index({ guildId: 1, staffId: 1, createdAt: -1 });
staffTagRestrictionSchema.index({ isActive: 1, expiresAt: 1 });

staffTagRestrictionSchema.index(
  { guildId: 1, staffId: 1 },
  {
    name: "one_active_tag_restriction_per_staff",
    unique: true,
    partialFilterExpression: { isActive: true },
  },
);

export const StaffTagRestrictionModel: Model<StaffTagRestriction> =
  (mongoose.models.StaffTagRestriction as Model<StaffTagRestriction> | undefined) ??
  mongoose.model<StaffTagRestriction>("StaffTagRestriction", staffTagRestrictionSchema);
