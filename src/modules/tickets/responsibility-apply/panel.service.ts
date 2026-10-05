import type { Guild, GuildTextBasedChannel } from "discord.js";
import { RESPONSIBILITY_APPLY_PANEL_ID } from "../../../data/tickets/panels/responsibility-apply.ts";
import type { TicketPanelContent } from "../models/ticket-panel-settings.model.ts";
import { TicketPanelDeploymentModel } from "../models/ticket-panel-deployment.model.ts";
import { ticketPanelSettingsService } from "../services/ticket-panel-settings.service.ts";
import { buildResponsibilityApplyPanel } from "./render.ts";

export class ResponsibilityApplyPanelService {
  async deploy(
    guild: Guild,
    channel: GuildTextBasedChannel,
    content: TicketPanelContent,
  ): Promise<{ channelId: string; created: boolean }> {
    const saved = await ticketPanelSettingsService.saveContent(guild.id, RESPONSIBILITY_APPLY_PANEL_ID, content);
    const payload = buildResponsibilityApplyPanel(saved);
    const key = RESPONSIBILITY_APPLY_PANEL_ID;
    const existing = await TicketPanelDeploymentModel.findOne({ guildId: guild.id, key }).exec();

    if (existing && existing.channelId === channel.id) {
      const message = await channel.messages.fetch(existing.messageId).catch(() => null);
      if (message) {
        await message.edit(payload);
        return { channelId: channel.id, created: false };
      }
    }

    const sent = await channel.send(payload);
    await TicketPanelDeploymentModel.findOneAndUpdate(
      { guildId: guild.id, key },
      { $set: { channelId: channel.id, messageId: sent.id, panelCount: 1 } },
      { upsert: true, returnDocument: "after" },
    ).exec();

    if (existing && existing.channelId !== channel.id) {
      const old = await guild.channels.fetch(existing.channelId).catch(() => null);
      if (old?.isTextBased()) {
        await old.messages
          .fetch(existing.messageId)
          .then((message) => message.delete())
          .catch(() => undefined);
      }
    }
    return { channelId: channel.id, created: true };
  }
}

export const responsibilityApplyPanelService = new ResponsibilityApplyPanelService();
