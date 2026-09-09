import { ChannelType, type Guild, type GuildTextBasedChannel } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { VacationPanelDeploymentModel } from "../models/vacation-panel-deployment.model.ts";
import { buildVacationPanel } from "../render/panel.ts";

const M = vacationMessages.panel;

export interface PanelDeployResult {
  channelId: string;
  created: boolean;
}

export class VacationPanelService {
  async deploy(guild: Guild, channel: GuildTextBasedChannel): Promise<PanelDeployResult> {
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      throw new DomainError("VACATION_PANEL_CHANNEL_INVALID", M.setupChannelInvalid);
    }

    const payload = buildVacationPanel();
    const existing = await VacationPanelDeploymentModel.findOne({
      guildId: guild.id,
      key: "main",
    }).exec();

    if (existing && existing.channelId === channel.id) {
      const message = await channel.messages.fetch(existing.messageId).catch(() => null);
      if (message) {
        await message.edit(payload);
        return { channelId: channel.id, created: false };
      }
    }

    const sent = await channel.send(payload);
    await VacationPanelDeploymentModel.findOneAndUpdate(
      { guildId: guild.id, key: "main" },
      { $set: { channelId: channel.id, messageId: sent.id } },
      { upsert: true, returnDocument: "after" },
    ).exec();

    if (existing && existing.channelId !== channel.id) {
      const oldChannel = await guild.channels.fetch(existing.channelId).catch(() => null);
      if (oldChannel?.isTextBased()) {
        await oldChannel.messages
          .fetch(existing.messageId)
          .then((m) => m.delete())
          .catch(() => undefined);
      }
    }

    return { channelId: channel.id, created: true };
  }
}

export const vacationPanelService = new VacationPanelService();
