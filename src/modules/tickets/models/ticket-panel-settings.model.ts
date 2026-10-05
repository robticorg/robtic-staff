import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { ChannelId, GuildId, RoleId, Timestamps, UserId } from "../../../shared/types/index.ts";

export interface TicketPanelContent {
  title?: string | null;
  description?: string | null;
  image?: string | null;
}

export interface TicketPanelSettings extends Timestamps {
  guildId: GuildId;
  panelId: string;
  supportRoleId: RoleId | null;
  managerRoleId: RoleId | null;
  categoryId: ChannelId | null;
  logChannelId?: ChannelId | null;
  content?: TicketPanelContent | null;
  updatedBy?: UserId | null;
}

export type TicketPanelSettingsDocument = HydratedDocument<TicketPanelSettings>;

const ticketPanelSettingsSchema = new Schema<TicketPanelSettings>(
  {
    guildId: { type: String, required: true },
    panelId: { type: String, required: true },
    supportRoleId: { type: String, default: null },
    managerRoleId: { type: String, default: null },
    categoryId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    content: {
      title: { type: String, default: null },
      description: { type: String, default: null },
      image: { type: String, default: null },
    },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true, collection: "ticket_panel_settings" },
);

ticketPanelSettingsSchema.index({ guildId: 1, panelId: 1 }, { unique: true });

export const TicketPanelSettingsModel: Model<TicketPanelSettings> =
  (mongoose.models.TicketPanelSettings as Model<TicketPanelSettings> | undefined) ??
  mongoose.model<TicketPanelSettings>("TicketPanelSettings", ticketPanelSettingsSchema);
