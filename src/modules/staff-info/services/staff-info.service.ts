import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { DomainError, isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { staffInfoLimits as L } from "../../../data/staff-info/config.ts";
import { staffInfoMessages } from "../../../data/staff-info/messages.ts";
import { StaffInfoModel, type StaffInfoDocument } from "../models/staff-info.model.ts";

const M = staffInfoMessages.command;

export class StaffInfoError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message);
  }
}

const clip = (value: string, max: number) => value.trim().slice(0, max);

export class StaffInfoService {
  list(guildId: GuildId): Promise<StaffInfoDocument[]> {
    return StaffInfoModel.find({ guildId }).sort({ createdAt: 1 }).exec();
  }

  get(guildId: GuildId, infoId: string): Promise<StaffInfoDocument | null> {
    return StaffInfoModel.findOne({ guildId, infoId }).exec();
  }

  async search(guildId: GuildId, query: string): Promise<StaffInfoDocument[]> {
    const q = query.trim().toLowerCase();
    const all = await this.list(guildId);
    return (q ? all.filter((i) => i.name.toLowerCase().includes(q)) : all).slice(0, 25);
  }

  /** The content becomes page 1. */
  async add(input: {
    guildId: GuildId;
    name: string;
    description: string;
    content: string;
    createdBy: UserId;
  }): Promise<StaffInfoDocument> {
    const name = clip(input.name, L.nameMaxLength);
    const description = clip(input.description, L.descriptionMaxLength);
    const content = clip(input.content, L.contentMaxLength);
    if (!name || !description || !content) {
      throw new StaffInfoError("STAFF_INFO_FIELDS", M.fieldsRequired);
    }
    if ((await StaffInfoModel.countDocuments({ guildId: input.guildId })) >= L.maxInfos) {
      throw new StaffInfoError("STAFF_INFO_LIMIT", M.tooMany);
    }
    try {
      return await StaffInfoModel.create({
        guildId: input.guildId,
        name,
        description,
        pages: [content],
        createdBy: input.createdBy,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new StaffInfoError("STAFF_INFO_NAME_TAKEN", M.nameTaken(name));
      throw err;
    }
  }

  async addPage(guildId: GuildId, infoId: string, content: string): Promise<StaffInfoDocument> {
    const page = clip(content, L.contentMaxLength);
    if (!page) throw new StaffInfoError("STAFF_INFO_CONTENT", M.contentRequired);

    // The size check is part of the filter, so two admins adding at once can't pass the limit.
    const updated = await StaffInfoModel.findOneAndUpdate(
      { guildId, infoId, [`pages.${L.maxPages - 1}`]: { $exists: false } },
      { $push: { pages: page } },
      { returnDocument: "after" },
    ).exec();
    if (updated) return updated;

    const exists = await this.get(guildId, infoId);
    throw exists
      ? new StaffInfoError("STAFF_INFO_PAGE_LIMIT", M.tooManyPages)
      : new StaffInfoError("STAFF_INFO_NOT_FOUND", M.notFound);
  }

  /**
   * Deletes one page (1-based). The last remaining page can't go — the info would be
   * empty. The write only lands if the pages are still exactly what we read, so a page
   * added or deleted at the same moment is never removed by mistake.
   */
  async removePage(
    guildId: GuildId,
    infoId: string,
    page: number,
  ): Promise<{ info: StaffInfoDocument; removed: number }> {
    const info = await this.get(guildId, infoId);
    if (!info) throw new StaffInfoError("STAFF_INFO_NOT_FOUND", M.notFound);
    if (!Number.isInteger(page) || page < 1 || page > info.pages.length) {
      throw new StaffInfoError("STAFF_INFO_PAGE_RANGE", M.pageNotFound(info.pages.length));
    }
    if (info.pages.length === 1) throw new StaffInfoError("STAFF_INFO_LAST_PAGE", M.lastPage);

    const pages = info.pages.filter((_, i) => i !== page - 1);
    const updated = await StaffInfoModel.findOneAndUpdate(
      { guildId, infoId, pages: info.pages },
      { $set: { pages } },
      { returnDocument: "after" },
    ).exec();
    if (!updated) throw new StaffInfoError("STAFF_INFO_CHANGED", M.pageChanged);
    return { info: updated, removed: page };
  }

  /** Replaces one page's content (1-based); only if that page still exists. */
  async editPage(
    guildId: GuildId,
    infoId: string,
    page: number,
    content: string,
  ): Promise<StaffInfoDocument> {
    const text = clip(content, L.contentMaxLength);
    if (!text) throw new StaffInfoError("STAFF_INFO_CONTENT", M.contentRequired);
    if (!Number.isInteger(page) || page < 1) {
      throw new StaffInfoError("STAFF_INFO_PAGE_RANGE", M.notFound);
    }

    const index = page - 1;
    const updated = await StaffInfoModel.findOneAndUpdate(
      { guildId, infoId, [`pages.${index}`]: { $exists: true } },
      { $set: { [`pages.${index}`]: text } },
      { returnDocument: "after" },
    ).exec();
    if (updated) return updated;

    const info = await this.get(guildId, infoId);
    throw info
      ? new StaffInfoError("STAFF_INFO_PAGE_RANGE", M.pageNotFound(info.pages.length))
      : new StaffInfoError("STAFF_INFO_NOT_FOUND", M.notFound);
  }

  /** roleId null opens the info to everyone again. */
  async setAccess(guildId: GuildId, infoId: string, roleId: string | null): Promise<StaffInfoDocument> {
    const updated = await StaffInfoModel.findOneAndUpdate(
      { guildId, infoId },
      { $set: { accessRoleId: roleId } },
      { returnDocument: "after" },
    ).exec();
    if (!updated) throw new StaffInfoError("STAFF_INFO_NOT_FOUND", M.notFound);
    return updated;
  }

  async remove(guildId: GuildId, infoId: string): Promise<StaffInfoDocument> {
    const removed = await StaffInfoModel.findOneAndDelete({ guildId, infoId }).exec();
    if (!removed) throw new StaffInfoError("STAFF_INFO_NOT_FOUND", M.notFound);
    return removed;
  }
}

export const staffInfoService = new StaffInfoService();
