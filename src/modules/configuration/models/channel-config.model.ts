import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { ChannelId, GuildId } from "../../../shared/types/index.ts";
import { CHANNEL_CONFIG_TYPE_VALUES, type ChannelConfigType } from "../types/enums.ts";

export interface ChannelConfig {
  guildId: GuildId;
  type: ChannelConfigType;
  channelId: ChannelId;
  createdAt: Date;
  updatedAt: Date;
}

export type ChannelConfigDocument = HydratedDocument<ChannelConfig>;

const channelConfigSchema = new Schema<ChannelConfig>(
  {
    guildId: { type: String, required: true, index: true },
    type: { type: String, enum: CHANNEL_CONFIG_TYPE_VALUES, required: true },
    channelId: { type: String, required: true },
  },
  { timestamps: true, collection: "channel_configs" },
);

channelConfigSchema.index({ guildId: 1, type: 1 }, { unique: true });

export const ChannelConfigModel: Model<ChannelConfig> =
  (mongoose.models.ChannelConfig as Model<ChannelConfig> | undefined) ??
  mongoose.model<ChannelConfig>("ChannelConfig", channelConfigSchema);
