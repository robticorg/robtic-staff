import type { GuildId, RoleId } from "../../../../shared/types/index.ts";
import { HiddenStaffConfigModel, type HiddenStaffConfig } from "../models/hidden-staff-config.model.ts";

export type HiddenConfigView = Pick<HiddenStaffConfig, "hiddenStartRoleId" | "hiddenEndRoleId" | "hiddenIgnoredRoleIds">;

const EMPTY: HiddenConfigView = { hiddenStartRoleId: null, hiddenEndRoleId: null, hiddenIgnoredRoleIds: [] };

export class HiddenStaffConfigRepository {
  async get(guildId: GuildId): Promise<HiddenConfigView> {
    const doc = await HiddenStaffConfigModel.findOne({ guildId }).lean().exec();
    if (!doc) return { ...EMPTY, hiddenIgnoredRoleIds: [] };
    return {
      hiddenStartRoleId: doc.hiddenStartRoleId ?? null,
      hiddenEndRoleId: doc.hiddenEndRoleId ?? null,
      hiddenIgnoredRoleIds: [...(doc.hiddenIgnoredRoleIds ?? [])],
    };
  }

  async save(guildId: GuildId, view: HiddenConfigView): Promise<void> {
    await HiddenStaffConfigModel.updateOne(
      { guildId },
      {
        $set: {
          hiddenStartRoleId: view.hiddenStartRoleId,
          hiddenEndRoleId: view.hiddenEndRoleId,
          hiddenIgnoredRoleIds: [...new Set(view.hiddenIgnoredRoleIds)],
        },
      },
      { upsert: true },
    ).exec();
  }

  async addIgnored(guildId: GuildId, roleId: RoleId): Promise<void> {
    await HiddenStaffConfigModel.updateOne({ guildId }, { $addToSet: { hiddenIgnoredRoleIds: roleId } }, { upsert: true }).exec();
  }

  async removeIgnored(guildId: GuildId, roleId: RoleId): Promise<boolean> {
    const result = await HiddenStaffConfigModel.updateOne({ guildId }, { $pull: { hiddenIgnoredRoleIds: roleId } }).exec();
    return result.modifiedCount > 0;
  }
}

export const hiddenStaffConfigRepository = new HiddenStaffConfigRepository();
