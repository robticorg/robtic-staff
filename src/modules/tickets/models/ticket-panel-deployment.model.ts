import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, Timestamps } from "../../../shared/types/index.ts";

export interface TicketPanelDeployment extends Timestamps {
  guildId: GuildId;

  key: string;
  channelId: ChannelId;
  messageId: string;

  panelCount: number;
}

export type TicketPanelDeploymentDocument = HydratedDocument<TicketPanelDeployment>;

const schema = new Schema<TicketPanelDeployment>(
  {
    guildId: { type: String, required: true },
    key: { type: String, required: true, default: "main" },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    panelCount: { type: Number, default: 0, min: 0, required: true },
  },
  { timestamps: true, collection: "ticket_panel_deployments" },
);

schema.index({ guildId: 1, key: 1 }, { unique: true });

export const TicketPanelDeploymentModel: Model<TicketPanelDeployment> =
  (mongoose.models.TicketPanelDeployment as Model<TicketPanelDeployment> | undefined) ??
  mongoose.model<TicketPanelDeployment>("TicketPanelDeployment", schema);
