import { ChannelType } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { buildServerTagLog, type ServerTagLogEvent } from "../render/log.ts";
import { getServerTagClient } from "../runtime.ts";

const log = logger.child("server-tag:log");

/**
 * §23 — best-effort audit trail. Logging must never be able to fail a role
 * operation, so every path here swallows its errors.
 */
export class ServerTagLogService {
  async post(guildId: GuildId, event: ServerTagLogEvent): Promise<void> {
    try {
      const channelId = await channelConfigService.getChannelId(
        guildId,
        ChannelConfigType.SERVER_TAG_LOG,
      );
      if (!channelId) return;

      const client = getServerTagClient();
      if (!client) return;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (
        !channel ||
        (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
      ) {
        return;
      }

      await channel.send({
        content: buildServerTagLog(event),
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      log.warn(`server tag log post failed for guild ${guildId}`, err);
    }
  }

  async dm(userId: UserId, content: string): Promise<boolean> {
    try {
      const client = getServerTagClient();
      if (!client) return false;
      const user = await client.users.fetch(userId);
      const channel = await user.createDM();
      await channel.send({ content, allowedMentions: { parse: [] } });
      return true;
    } catch (err) {
      log.warn(`server tag DM to ${userId} failed`, err);
      return false;
    }
  }
}

export const serverTagLogService = new ServerTagLogService();
