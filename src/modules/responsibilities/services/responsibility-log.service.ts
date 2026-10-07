import type { Guild } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { buildLogCard, type LogTone } from "../../../libs/discord/index.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { commandLogService } from "../../command-log/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";

const log = logger.child("responsibilities:log");
const L = responsibilityMessages.log;

export type ResponsibilityLogKind = "ASSIGNED" | "REMOVED" | "EXPIRED" | "PROBLEM";

const TITLE: Record<ResponsibilityLogKind, string> = {
  ASSIGNED: L.assigned,
  REMOVED: L.removed,
  EXPIRED: L.expired,
  PROBLEM: L.problem,
};

const TONE: Record<ResponsibilityLogKind, LogTone> = {
  ASSIGNED: "success",
  REMOVED: "warning",
  EXPIRED: "neutral",
  PROBLEM: "error",
};

export interface ResponsibilityLogEntry {
  kind: ResponsibilityLogKind;
  userId: string;
  title: string;
  roleId: string;
  actorId?: string | null;
  expiresAt?: Date | null;
  note?: string | null;
}

export class ResponsibilityLogService {
  async post(guild: Guild, entry: ResponsibilityLogEntry): Promise<void> {
    try {
      const channelId = await commandLogService.resolveChannelId(guild.id, ChannelConfigType.STAFF_LOG);
      if (!channelId) return;
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased() || !("send" in channel)) return;
      await channel.send(
        buildLogCard({
          title: TITLE[entry.kind],
          tone: TONE[entry.kind],
          fields: [
            { label: L.member, value: `<@${entry.userId}>` },
            { label: L.responsibility, value: entry.title },
            { label: L.role, value: `<@&${entry.roleId}>` },
            ...(entry.actorId ? [{ label: L.by, value: `<@${entry.actorId}>` }] : []),
            ...(entry.expiresAt ? [{ label: L.expiresAt, value: L.at(entry.expiresAt) }] : []),
            ...(entry.note ? [{ label: L.note, value: entry.note }] : []),
          ],
        }),
      );
    } catch (err) {
      log.warn(`responsibility log post failed in ${guild.id}`, err);
    }
  }
}

export const responsibilityLogService = new ResponsibilityLogService();
