import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import {
  ResponsibilityModel,
  type Responsibility,
  type ResponsibilityDocument,
} from "../models/responsibility.model.ts";

export class ResponsibilityRepository extends BaseRepository<Responsibility> {
  constructor() {
    super(ResponsibilityModel);
  }

  byId(guildId: GuildId, responsibilityId: string): Promise<ResponsibilityDocument | null> {
    return this.findOne({ guildId, responsibilityId, disabled: false });
  }

  byIdIncludingDisabled(guildId: GuildId, responsibilityId: string): Promise<ResponsibilityDocument | null> {
    return this.findOne({ guildId, responsibilityId });
  }

  byRole(guildId: GuildId, roleId: RoleId): Promise<ResponsibilityDocument | null> {
    return this.findOne({ guildId, roleId, disabled: false });
  }

  byTitle(guildId: GuildId, title: string): Promise<ResponsibilityDocument | null> {
    return this.findOne({ guildId, title, disabled: false });
  }

  listEnabled(guildId: GuildId): Promise<ResponsibilityDocument[]> {
    return ResponsibilityModel.find({ guildId, disabled: false }).sort({ createdAt: 1 }).exec();
  }

  listByIds(guildId: GuildId, ids: readonly string[]): Promise<ResponsibilityDocument[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return ResponsibilityModel.find({ guildId, responsibilityId: { $in: [...ids] } }).exec();
  }
}

export const responsibilityRepository = new ResponsibilityRepository();
