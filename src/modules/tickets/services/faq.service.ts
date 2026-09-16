import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { limits } from "../../../data/config/limits.ts";
import { FaqModel, type Faq } from "../models/faq.model.ts";

export interface AddFaqInput {
  guildId: GuildId;
  question: string;
  answer: string;
  createdBy: UserId;
  /** Omit or leave empty to show this FAQ on every ticket panel. */
  panelIds?: string[];
}

export class FaqService extends BaseRepository<Faq> {
  constructor() {
    super(FaqModel);
  }

  add(input: AddFaqInput): Promise<HydratedDocument<Faq>> {
    if (!input.question?.trim() || !input.answer?.trim()) {
      throw new ValidationError("لازم سؤال وإجابة الاثنين");
    }
    return this.insert({
      guildId: input.guildId,
      question: input.question.trim(),
      answer: input.answer.trim(),
      createdBy: input.createdBy,
      panelIds: input.panelIds ?? [],
    });
  }

  /** With `panelId`, only FAQs scoped to it (or scoped to nothing — every panel) come back. */
  async list(guildId: GuildId, panelId?: string): Promise<HydratedDocument<Faq>[]> {
    const all = await this.model.find({ guildId }).sort({ createdAt: 1 }).exec();
    if (!panelId) return all;
    return all.filter((f) => f.panelIds.length === 0 || f.panelIds.includes(panelId));
  }

  get(guildId: GuildId, faqId: string): Promise<HydratedDocument<Faq> | null> {
    return this.findOne({ guildId, faqId });
  }

  async remove(guildId: GuildId, faqId: string): Promise<HydratedDocument<Faq>> {
    const removed = await this.model.findOneAndDelete({ guildId, faqId }).exec();
    if (!removed) throw new NotFoundError("faq", { guildId, faqId });
    return removed;
  }

  countForGuild(guildId: GuildId): Promise<number> {
    return this.model.countDocuments({ guildId }).exec();
  }

  async search(guildId: GuildId, query: string): Promise<HydratedDocument<Faq>[]> {
    const all = await this.list(guildId);
    const q = query.trim().toLowerCase();
    const matched = q ? all.filter((f) => f.question.toLowerCase().includes(q)) : all;
    return matched.slice(0, limits.faqAutocompleteResults);
  }

  /** Sets this FAQ to show on exactly one panel, or on every panel when `panelId` is omitted. */
  async assignPanel(
    guildId: GuildId,
    faqId: string,
    panelId: string | null,
  ): Promise<HydratedDocument<Faq>> {
    const updated = await this.model
      .findOneAndUpdate(
        { guildId, faqId },
        { $set: { panelIds: panelId ? [panelId] : [] } },
        { returnDocument: "after" },
      )
      .exec();
    if (!updated) throw new NotFoundError("faq", { guildId, faqId });
    return updated;
  }
}

export const faqService = new FaqService();
