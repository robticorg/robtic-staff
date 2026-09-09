import { logger } from "../../../shared/utils/logger.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { buildPunishmentLog } from "../render/log.ts";
import { requirePunishmentClient } from "../runtime.ts";

const log = logger.child("punishment:log");

export class PunishmentLogService {
  async record(punishment: Punishment): Promise<void> {
    try {
      const channelId = await channelConfigService.getChannelId(
        punishment.guildId,
        ChannelConfigType.PUNISHMENT_LOG,
      );
      if (!channelId) {
        log.warn(`PUNISHMENT_LOG not configured for guild ${punishment.guildId}`);
        return;
      }
      const channel = await requirePunishmentClient().channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        log.warn(`PUNISHMENT_LOG channel unavailable for guild ${punishment.guildId}`);
        return;
      }
      await channel.send({ content: buildPunishmentLog(punishment), allowedMentions: { parse: [] } });
    } catch (err) {
      log.warn("punishment log send failed", err);
    }
  }
}

export const punishmentLogService = new PunishmentLogService();
