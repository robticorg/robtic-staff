import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";
import { ROLE_CONFIG_TYPE_VALUES, type RoleConfigType } from "../../configuration/types/enums.ts";
import {
  RESPONSIBILITY_CATEGORY_VALUES,
  ResponsibilityCategory,
} from "../types/enums.ts";

export interface Responsibility extends Timestamps {
  responsibilityId: string;
  guildId: GuildId;
  roleId: RoleId;
  permission: RoleConfigType;
  title: string;
  description: string;
  category: ResponsibilityCategory;
  isTemporary: boolean;
  defaultDuration?: number | null;
  disabled: boolean;
  createdBy: UserId;
}

export type ResponsibilityDocument = HydratedDocument<Responsibility>;

const responsibilitySchema = new Schema<Responsibility>(
  {
    responsibilityId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true, index: true },
    roleId: { type: String, required: true },
    permission: { type: String, enum: ROLE_CONFIG_TYPE_VALUES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: RESPONSIBILITY_CATEGORY_VALUES,
      default: ResponsibilityCategory.OTHER,
      required: true,
    },
    isTemporary: { type: Boolean, required: true, default: false },
    defaultDuration: { type: Number, default: null },
    disabled: { type: Boolean, required: true, default: false },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: "responsibilities" },
);

responsibilitySchema.index(
  { guildId: 1, roleId: 1 },
  { unique: true, partialFilterExpression: { disabled: false }, name: "one_responsibility_per_role" },
);
responsibilitySchema.index(
  { guildId: 1, title: 1 },
  { unique: true, partialFilterExpression: { disabled: false }, name: "unique_responsibility_title" },
);

export const ResponsibilityModel: Model<Responsibility> =
  (mongoose.models.Responsibility as Model<Responsibility> | undefined) ??
  mongoose.model<Responsibility>("Responsibility", responsibilitySchema);
