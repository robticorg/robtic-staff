import { ChannelType, type Guild, type GuildTextBasedChannel } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { VacationPanelDeploymentModel } from "../../vacation/models/vacation-panel-deployment.model.ts";
import { buildStaffSupportPanel } from "../render/panel.ts";

const log = logger.child("staff-support:panel");
const M = staffSupportMessages.panel;

export interface PanelDeployResult {
  channelId: string;
  created: boolean;
}

/**
 * Deploys the Staff Support panel — the single entry point that replaced the
 * Break-only panel.
 *
 * It deliberately reuses the existing panel deployment record: that is what
 * makes this a *replacement* rather than a second panel. A guild that already
 * had the Break panel deployed gets it edited in place into the new one, so no
 * orphan Break panel is left behind for members to click.
 */
export class StaffSupportPanelService {
  async deploy(guild: Guild, channel: GuildTextBasedChannel): Promise<PanelDeployResult> {
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      throw new DomainError("STAFF_SUPPORT_PANEL_CHANNEL_INVALID", M.setupChannelInvalid);
    }

    const payload = buildStaffSupportPanel();
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

    // Moving the panel to another channel removes the old message, so the
    // superseded panel can never be clicked.
    if (existing && existing.channelId !== channel.id) {
      const oldChannel = await guild.channels.fetch(existing.channelId).catch(() => null);
      if (oldChannel?.isTextBased()) {
        await oldChannel.messages
          .fetch(existing.messageId)
          .then((m) => m.delete())
          .catch(() => undefined);
      }
    }

    log.info(`staff support panel deployed in ${guild.id} (#${channel.id})`);
    return { channelId: channel.id, created: true };
  }
}

export const staffSupportPanelService = new StaffSupportPanelService();
