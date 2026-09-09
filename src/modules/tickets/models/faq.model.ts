import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId, Timestamps, UserId } from "../../../shared/types/index.ts";
import { shortId } from "../../../shared/utils/id.ts";

export interface Faq extends Timestamps {
  faqId: string;
  guildId: GuildId;
  question: string;
  answer: string;
  createdBy: UserId;
}

export type FaqDocument = HydratedDocument<Faq>;

const faqSchema = new Schema<Faq>(
  {
    faqId: { type: String, required: true, default: () => shortId(6) },
    guildId: { type: String, required: true, index: true },
    question: { type: String, required: true, trim: true, maxlength: 250 },
    answer: { type: String, required: true, trim: true, maxlength: 2000 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: "faqs" },
);

faqSchema.index({ guildId: 1, faqId: 1 }, { unique: true });
faqSchema.index({ guildId: 1, createdAt: 1 });

export const FaqModel: Model<Faq> =
  (mongoose.models.Faq as Model<Faq> | undefined) ?? mongoose.model<Faq>("Faq", faqSchema);
