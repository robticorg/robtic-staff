import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";

/** One entry of the staff information menu. Page 1 is the content given in /info add. */
export interface StaffInfo {
  infoId: string;
  guildId: GuildId;
  name: string;
  description: string;
  pages: string[];
  /** Only members with this role (or administrators) may open it. null = everyone. */
  accessRoleId: string | null;
  createdBy: UserId;
  createdAt: Date;
}

export type StaffInfoDocument = HydratedDocument<StaffInfo>;

const staffInfoSchema = new Schema<StaffInfo>(
  {
    infoId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    pages: { type: [String], required: true },
    accessRoleId: { type: String, default: null },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date(), immutable: true },
  },
  { collection: "staff_info", versionKey: false },
);

// Menu order = creation order; names are unique per guild so the menu never shows twins.
staffInfoSchema.index({ guildId: 1, createdAt: 1 });
staffInfoSchema.index({ guildId: 1, name: 1 }, { unique: true });

export const StaffInfoModel: Model<StaffInfo> =
  (mongoose.models.StaffInfo as Model<StaffInfo> | undefined) ??
  mongoose.model<StaffInfo>("StaffInfo", staffInfoSchema);

/** Where the panel message lives, so adding/removing an info can edit it. */
export interface StaffInfoPanel {
  guildId: GuildId;
  channelId: string;
  messageId: string;
}

const staffInfoPanelSchema = new Schema<StaffInfoPanel>(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
  },
  { collection: "staff_info_panels", versionKey: false },
);

export const StaffInfoPanelModel: Model<StaffInfoPanel> =
  (mongoose.models.StaffInfoPanel as Model<StaffInfoPanel> | undefined) ??
  mongoose.model<StaffInfoPanel>("StaffInfoPanel", staffInfoPanelSchema);
