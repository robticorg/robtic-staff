import { logger } from "../../../shared/utils/logger.ts";
import { logCardFromText, type LogTone } from "../../../libs/discord/index.ts";
import { PunishmentStatus } from "../types/enums.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { buildPunishmentLog } from "../render/log.ts";
import { requirePunishmentClient } from "../runtime.ts";

const log = logger.child("punishment:log");

/** Red while a punishment is in force, green once it's lifted, yellow when it didn't go through. */
function toneFor(status: PunishmentStatus): LogTone {
  switch (status) {
    case PunishmentStatus.EXECUTED:
      return "error";
    case PunishmentStatus.REVOKED:
    case PunishmentStatus.EXPIRED:
      return "success";
    case PunishmentStatus.FAILED:
    case PunishmentStatus.REJECTED:
      return "warning";
    default:
      return "info";
  }
}

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
      await channel.send(logCardFromText(buildPunishmentLog(punishment), toneFor(punishment.status)));
    } catch (err) {
      log.warn("punishment log send failed", err);
    }
  }
}

export const punishmentLogService = new PunishmentLogService();
