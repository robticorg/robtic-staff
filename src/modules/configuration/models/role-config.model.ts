import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { STAFF_TYPE_VALUES, type StaffType } from "../../staff/types/enums.ts";
import {
  ROLE_CONFIG_TYPE_VALUES,
  RoleConfigType,
  STAFF_TIER_VALUES,
  type StaffTier,
} from "../types/enums.ts";

export interface RoleConfig {
  guildId: GuildId;
  roleId: RoleId;
  type: RoleConfigType;

  level?: number;

  /**
   * Marks this numbered role as the first rung of a tier (HIGHSTAFF / OWNER /
   * SHIP). Deliberately a separate field rather than a `type`, so a boundary
   * role stays an ordinary ladder rung and `rebuildLadder` — which only $sets
   * `type` and `level` — leaves the marker intact.
   */
  boundary?: StaffTier;

  /**
   * Inclusive numbered-level window this row applies to (ACCEPTED roles).
   * Both null/absent means "every level". These are *not* the role's own
   * level — a row carrying a range never joins the ladder.
   */
  rangeFromLevel?: number;
  rangeToLevel?: number;

  /**
   * Which Staff Type this role represents, on `type: STAFF_TYPE` rows only.
   * Stored as the internal id (MAX / DEV) — never an Arabic keyword.
   */
  staffType?: StaffType;

  createdAt: Date;
  updatedAt: Date;
}

export type RoleConfigDocument = HydratedDocument<RoleConfig>;

const roleConfigSchema = new Schema<RoleConfig>(
  {
    guildId: { type: String, required: true, index: true },
    roleId: { type: String, required: true },
    type: { type: String, enum: ROLE_CONFIG_TYPE_VALUES, required: true },

    level: { type: Number, min: 0 },
    boundary: { type: String, enum: STAFF_TIER_VALUES },
    rangeFromLevel: { type: Number, min: 0 },
    rangeToLevel: { type: Number, min: 0 },
    staffType: { type: String, enum: STAFF_TYPE_VALUES },
  },
  { timestamps: true, collection: "role_configs" },
);

roleConfigSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

roleConfigSchema.index({ guildId: 1, type: 1 });

// At most one role per Staff Type per guild. Partial so the millions of rows
// without a staffType are not forced to collide on `null`.
roleConfigSchema.index(
  { guildId: 1, staffType: 1 },
  { unique: true, partialFilterExpression: { staffType: { $exists: true } } },
);

roleConfigSchema.index({ guildId: 1, level: 1 });

export const RoleConfigModel: Model<RoleConfig> =
  (mongoose.models.RoleConfig as Model<RoleConfig> | undefined) ??
  mongoose.model<RoleConfig>("RoleConfig", roleConfigSchema);
