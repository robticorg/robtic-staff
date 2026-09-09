import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId, Timestamps } from "../../../shared/types/index.ts";

export interface VacationPanelDeployment extends Timestamps {
  guildId: GuildId;
  key: string;
  channelId: ChannelId;
  messageId: string;
}

export type VacationPanelDeploymentDocument = HydratedDocument<VacationPanelDeployment>;

const schema = new Schema<VacationPanelDeployment>(
  {
    guildId: { type: String, required: true },
    key: { type: String, required: true, default: "main" },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
  },
  { timestamps: true, collection: "vacation_panel_deployments" },
);

schema.index({ guildId: 1, key: 1 }, { unique: true });

export const VacationPanelDeploymentModel: Model<VacationPanelDeployment> =
  (mongoose.models.VacationPanelDeployment as Model<VacationPanelDeployment> | undefined) ??
  mongoose.model<VacationPanelDeployment>("VacationPanelDeployment", schema);
