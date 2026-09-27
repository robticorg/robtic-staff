import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import {
  ROLE_CONFIG_TYPE_VALUES,
  type RoleConfigType,
} from "../../configuration/types/enums.ts";

export interface PersistentMemberRole extends Timestamps {
  guildId: GuildId;
  userId: UserId;
  type: RoleConfigType;
}

export type PersistentMemberRoleDocument = HydratedDocument<PersistentMemberRole>;

const schema = new Schema<PersistentMemberRole>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    type: { type: String, enum: ROLE_CONFIG_TYPE_VALUES, required: true },
  },
  { collection: "persistent_member_roles", versionKey: false, timestamps: true },
);

schema.index({ guildId: 1, userId: 1, type: 1 }, { unique: true });

export const PersistentMemberRoleModel: Model<PersistentMemberRole> =
  (mongoose.models.PersistentMemberRole as Model<PersistentMemberRole> | undefined) ??
  mongoose.model<PersistentMemberRole>("PersistentMemberRole", schema);
