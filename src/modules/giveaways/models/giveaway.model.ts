import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { ChannelId, GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";

export const GiveawayStatus = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;
export type GiveawayStatus = (typeof GiveawayStatus)[keyof typeof GiveawayStatus];

export interface Giveaway extends Timestamps {
  giveawayId: string;
  guildId: GuildId;
  channelId: ChannelId;
  messageId: string;
  botId: UserId;
  title?: string | null;
  endsAt: Date;
  createdBy: UserId;
  status: GiveawayStatus;
  winners: UserId[];
  endedAt?: Date;
}

export type GiveawayDocument = HydratedDocument<Giveaway>;

const giveawaySchema = new Schema<Giveaway>(
  {
    giveawayId: { type: String, required: true, unique: true, default: () => shortId(10) },
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    botId: { type: String, required: true },
    title: { type: String, default: null, maxlength: 100 },
    endsAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(GiveawayStatus),
      default: GiveawayStatus.ACTIVE,
      required: true,
    },
    winners: { type: [String], default: [] },
    endedAt: { type: Date },
  },
  { timestamps: true, collection: "giveaways" },
);

giveawaySchema.index({ guildId: 1, messageId: 1 }, { unique: true });
giveawaySchema.index({ guildId: 1, status: 1, createdAt: -1 });
giveawaySchema.index({ channelId: 1, botId: 1, endsAt: 1 });

export const GiveawayModel: Model<Giveaway> =
  (mongoose.models.Giveaway as Model<Giveaway> | undefined) ??
  mongoose.model<Giveaway>("Giveaway", giveawaySchema);
