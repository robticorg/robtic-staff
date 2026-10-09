import { ChannelType, type Guild, type GuildBasedChannel } from "discord.js";
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
  /** Public panels left off because they aren't set up yet — they appear once they are. */
  notSetUp: string[];
}

export class TicketSetupService {
  async deploy(guild: Guild, target?: GuildBasedChannel): Promise<DeployResult> {
    const main = ticketConfigService.getMainConfig();
    if (ticketConfigService.listPublicPanels().length === 0) throw new ValidationError(M.noPanels);

    // Panels that aren't set up (or are closed with /intake close) are left off, not an error:
    // the panel can be sent in a fresh server and fills in as each type gets set up.
    const panels = await ticketConfigService.listOpenPublicPanels(guild);
    const notSetUp: string[] = [];
    for (const panel of ticketConfigService.listPublicPanels()) {
      if (!(await ticketConfigService.isPanelReady(guild, panel))) notSetUp.push(panel.name);
    }

    const previous = target
      ? null
      : await TicketPanelDeploymentModel.findOne({ guildId: guild.id, key: "main" }).exec();
    const channel = target ?? (previous ? await guild.channels.fetch(previous.channelId).catch(() => null) : null);
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
        return { channelId: channel.id, panelCount: panels.length, created: false, notSetUp };
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

    return { channelId: channel.id, panelCount: panels.length, created: true, notSetUp };
  }

  /**
   * Re-renders the sent ticket panel with what is open right now — after `/intake close|open`,
   * after a type is set up, and on startup. Does nothing when no panel was sent in this server.
   */
  async refresh(guild: Guild): Promise<void> {
    const deployment = await TicketPanelDeploymentModel.findOne({ guildId: guild.id, key: "main" }).exec();
    if (!deployment) return;
    const channel = await guild.channels.fetch(deployment.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const message = await channel.messages.fetch(deployment.messageId).catch(() => null);
    if (!message) return;

    const panels = await ticketConfigService.listOpenPublicPanels(guild);
    await message.edit(buildTicketPanelMessage(ticketConfigService.getMainConfig(), panels));
    if (deployment.panelCount !== panels.length) {
      deployment.panelCount = panels.length;
      await deployment.save();
    }
  }
}

export const ticketSetupService = new TicketSetupService();
