import type { GuildId, UserId } from "../../../../shared/types/index.ts";
import { HiddenStaffModel, type HiddenStaffDocument } from "../models/hidden-staff.model.ts";

export class HiddenStaffRepository {
  get(guildId: GuildId, userId: UserId): Promise<HiddenStaffDocument | null> {
    return HiddenStaffModel.findOne({ guildId, userId }).exec();
  }

  async isActive(guildId: GuildId, userId: UserId): Promise<boolean> {
    return !!(await HiddenStaffModel.exists({ guildId, userId, active: true }).exec());
  }

  async activate(input: { guildId: GuildId; userId: UserId; level: number; acceptedBy?: UserId; at?: Date }): Promise<void> {
    const at = input.at ?? new Date();
    await HiddenStaffModel.updateOne(
      { guildId: input.guildId, userId: input.userId },
      {
        $set: {
          active: true,
          currentLevel: input.level,
          removedBy: null,
          removedAt: null,
          ...(input.acceptedBy ? { acceptedBy: input.acceptedBy, acceptedAt: at } : {}),
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  async setLevel(guildId: GuildId, userId: UserId, level: number): Promise<void> {
    await HiddenStaffModel.updateOne({ guildId, userId }, { $set: { currentLevel: level } }).exec();
  }

  async deactivate(guildId: GuildId, userId: UserId, removedBy: UserId | null, at: Date = new Date()): Promise<void> {
    await HiddenStaffModel.updateOne(
      { guildId, userId },
      { $set: { active: false, currentLevel: 0, removedBy, removedAt: at } },
    ).exec();
  }
}

export const hiddenStaffRepository = new HiddenStaffRepository();
