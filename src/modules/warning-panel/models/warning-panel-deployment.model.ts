import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, Timestamps } from "../../../shared/types/index.ts";

export interface WarningPanelDeployment extends Timestamps {
  guildId: GuildId;
  key: string;
  channelId: ChannelId;
  messageId: string;
}

export type WarningPanelDeploymentDocument = HydratedDocument<WarningPanelDeployment>;

const schema = new Schema<WarningPanelDeployment>(
  {
    guildId: { type: String, required: true },
    key: { type: String, required: true, default: "main" },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
  },
  { timestamps: true, collection: "warning_panel_deployments" },
);

schema.index({ guildId: 1, key: 1 }, { unique: true });

export const WarningPanelDeploymentModel: Model<WarningPanelDeployment> =
  (mongoose.models.WarningPanelDeployment as Model<WarningPanelDeployment> | undefined) ??
  mongoose.model<WarningPanelDeployment>("WarningPanelDeployment", schema);
