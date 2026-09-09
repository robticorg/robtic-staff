import { ChannelType, type Guild } from "discord.js";
import { DomainError, ValidationError } from "../../../shared/utils/errors.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketPanelDeploymentModel } from "../models/ticket-panel-deployment.model.ts";
import { buildTicketPanelMessage } from "../render/panel-message.ts";
import { ticketConfigService } from "./ticket-config.service.ts";

const M = ticketMessages.setup;

export interface DeployResult {
  channelId: string;
  panelCount: number;
  created: boolean;
}

export class TicketSetupService {
  async deploy(guild: Guild): Promise<DeployResult> {
    const main = ticketConfigService.getMainConfig();
    const panels = ticketConfigService.listPanels();
    if (panels.length === 0) throw new ValidationError(M.noPanels);

    const problems = await ticketConfigService.validateConfig(guild);
    if (problems.length > 0) {
      throw new DomainError("TICKET_CONFIG_INVALID", M.invalidConfig(problems), { problems });
    }

    const channel = await guild.channels.fetch(main.panelChannelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      throw new DomainError("TICKET_PANEL_CHANNEL_INVALID", M.invalidConfig([M.problem.mainChannelMissing]));
    }

    const payload = buildTicketPanelMessage(main, panels);
    const existing = await TicketPanelDeploymentModel.findOne({ guildId: guild.id, key: "main" }).exec();

    if (existing && existing.channelId === channel.id) {
      const message = await channel.messages.fetch(existing.messageId).catch(() => null);
      if (message) {
        await message.edit(payload);
        existing.panelCount = panels.length;
        await existing.save();
        return { channelId: channel.id, panelCount: panels.length, created: false };
      }
    }

    const sent = await channel.send(payload);
    await TicketPanelDeploymentModel.findOneAndUpdate(
      { guildId: guild.id, key: "main" },
      { $set: { channelId: channel.id, messageId: sent.id, panelCount: panels.length } },
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

    return { channelId: channel.id, panelCount: panels.length, created: true };
  }
}

export const ticketSetupService = new TicketSetupService();
