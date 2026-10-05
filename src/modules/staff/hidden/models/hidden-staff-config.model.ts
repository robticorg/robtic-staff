import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { GuildId, RoleId, Timestamps } from "../../../../shared/types/index.ts";

export interface HiddenStaffConfig extends Timestamps {
  guildId: GuildId;
  hiddenStartRoleId: RoleId | null;
  hiddenEndRoleId: RoleId | null;
  hiddenIgnoredRoleIds: RoleId[];
}

export type HiddenStaffConfigDocument = HydratedDocument<HiddenStaffConfig>;

const hiddenStaffConfigSchema = new Schema<HiddenStaffConfig>(
  {
    guildId: { type: String, required: true, unique: true },
    hiddenStartRoleId: { type: String, default: null },
    hiddenEndRoleId: { type: String, default: null },
    hiddenIgnoredRoleIds: { type: [String], default: [] },
  },
  { timestamps: true, collection: "hidden_staff_configs" },
);

export const HiddenStaffConfigModel: Model<HiddenStaffConfig> =
  (mongoose.models.HiddenStaffConfig as Model<HiddenStaffConfig> | undefined) ??
  mongoose.model<HiddenStaffConfig>("HiddenStaffConfig", hiddenStaffConfigSchema);
