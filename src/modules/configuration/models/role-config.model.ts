import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { ROLE_CONFIG_TYPE_VALUES, RoleConfigType } from "../types/enums.ts";

export interface RoleConfig {
  guildId: GuildId;
  roleId: RoleId;
  type: RoleConfigType;

  level?: number;
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
  },
  { timestamps: true, collection: "role_configs" },
);

roleConfigSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

roleConfigSchema.index({ guildId: 1, type: 1 });

roleConfigSchema.index({ guildId: 1, level: 1 });

export const RoleConfigModel: Model<RoleConfig> =
  (mongoose.models.RoleConfig as Model<RoleConfig> | undefined) ??
  mongoose.model<RoleConfig>("RoleConfig", roleConfigSchema);
