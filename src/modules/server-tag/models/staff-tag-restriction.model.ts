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

  /** Exact role ids held at capture time — the only source for restoration. */
  savedRoleIds: RoleId[];

  startedAt: Date;
  expiresAt: Date;

  status: StaffTagRestrictionStatus;

  /**
   * Mirrors `status === ACTIVE`. Kept as a separate field so a partial unique
   * index can enforce one live restriction per guild+staff.
   */
  isActive: boolean;

  restoredAt?: Date;
  restoredBy?: string;
  restorationReason?: StaffTagRestorationReason;

  /** False when the restriction closed without the roles actually going back. */
  rolesRestored?: boolean;
  /** Saved roles that no longer existed at restore time. */
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

// §20: exactly one ACTIVE restriction per guild + staff member. Duplicate
// tag-remove events collide here instead of creating a second snapshot.
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
