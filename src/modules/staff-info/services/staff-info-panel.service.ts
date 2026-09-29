import type { Guild, GuildTextBasedChannel } from "discord.js";
import type { GuildId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { StaffInfoPanelModel } from "../models/staff-info.model.ts";
import { buildStaffInfoPanel } from "../render/panel.ts";
import { staffInfoService } from "./staff-info.service.ts";

const log = logger.child("staff-info:panel");

export class StaffInfoPanelService {
  async payload(guildId: GuildId) {
    const infos = await staffInfoService.list(guildId);
    return buildStaffInfoPanel(
      infos.map((i) => ({ infoId: i.infoId, name: i.name, description: i.description })),
    );
  }

  /** Posts the panel here (or edits it in place if it's already here); an old copy elsewhere is deleted. */
  async deploy(guild: Guild, channel: GuildTextBasedChannel): Promise<{ created: boolean }> {
    const payload = await this.payload(guild.id);
    const existing = await StaffInfoPanelModel.findOne({ guildId: guild.id }).exec();

    if (existing?.channelId === channel.id) {
      const message = await channel.messages.fetch(existing.messageId).catch(() => null);
      if (message) {
        await message.edit(payload);
        return { created: false };
      }
    }

    const sent = await channel.send(payload);
    await StaffInfoPanelModel.findOneAndUpdate(
      { guildId: guild.id },
      { $set: { channelId: channel.id, messageId: sent.id } },
      { upsert: true },
    ).exec();

    if (existing && existing.channelId !== channel.id) {
      const old = await guild.channels.fetch(existing.channelId).catch(() => null);
      if (old?.isTextBased()) {
        await old.messages.fetch(existing.messageId).then((m) => m.delete()).catch(() => undefined);
      }
    }
    log.info(`staff info panel deployed in ${guild.id} (#${channel.id})`);
    return { created: true };
  }

  /**
   * Re-renders the posted panel with the current list. Returns false when no
   * panel is posted (or its message was deleted — the stale record is dropped).
   */
  async refresh(guild: Guild): Promise<boolean> {
    const existing = await StaffInfoPanelModel.findOne({ guildId: guild.id }).exec();
    if (!existing) return false;

    const channel = await guild.channels.fetch(existing.channelId).catch(() => null);
    const message =
      channel?.isTextBased() ? await channel.messages.fetch(existing.messageId).catch(() => null) : null;
    if (!message) {
      await StaffInfoPanelModel.deleteOne({ guildId: guild.id }).exec();
      log.warn(`staff info panel in ${guild.id} is gone — run /info setup again`);
      return false;
    }

    await message.edit(await this.payload(guild.id));
    return true;
  }
}

export const staffInfoPanelService = new StaffInfoPanelService();
