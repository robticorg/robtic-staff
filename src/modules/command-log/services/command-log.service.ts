import type { Guild } from "discord.js";
import type { ChannelId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import {
  PREFIX_CATEGORY_LOG_SLOTS,
  PREFIX_COMMAND_LOG_SLOTS,
  commandLogConfig,
} from "../../../data/command-log/config.ts";
import { commandLogMessages } from "../../../data/command-log/messages.ts";
import { logCardFromText, type LogTone } from "../../../libs/discord/index.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";

const log = logger.child("command-log");
const M = commandLogMessages;
const L = M.labels;

export const CommandLogOutcome = {
  SUCCESS: "SUCCESS",
  /** Refused by a guard or validation — the command did nothing. */
  DENIED: "DENIED",
  /** Crashed unexpectedly. */
  ERROR: "ERROR",
} as const;
export type CommandLogOutcome = (typeof CommandLogOutcome)[keyof typeof CommandLogOutcome];

const OUTCOME_TONE: Record<CommandLogOutcome, LogTone> = {
  SUCCESS: "success",
  DENIED: "warning",
  ERROR: "error",
};

export interface CommandLogEntry {
  /** The slot this command logs to; COMMAND_LOG is the fallback when it's unset. */
  slot: ChannelConfigType;
  invocation: string;
  actorId: UserId;
  channelId: ChannelId;
  targetIds: readonly UserId[];
  outcome: CommandLogOutcome;
  detail?: string | null;
  url?: string | null;
  at?: Date;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function prefixLogSlot(name: string, category: string): ChannelConfigType {
  return (
    PREFIX_COMMAND_LOG_SLOTS[name] ??
    PREFIX_CATEGORY_LOG_SLOTS[category] ??
    ChannelConfigType.COMMAND_LOG
  );
}

export function buildCommandLog(entry: CommandLogEntry): string {
  const targets = [...new Set(entry.targetIds)].slice(0, commandLogConfig.maxTargets);
  const lines = [
    M.headings[entry.outcome],
    M.line(L.command, M.code(clip(entry.invocation, commandLogConfig.invocationMaxLength))),
    M.line(L.actor, M.user(entry.actorId)),
    M.line(L.channel, M.channel(entry.channelId)),
  ];
  if (targets.length > 0) lines.push(M.line(L.targets, targets.map(M.user).join("، ")));
  if (entry.detail) {
    lines.push(M.line(L.detail, clip(entry.detail, commandLogConfig.detailMaxLength)));
  }
  lines.push(M.line(L.time, M.time(entry.at ?? new Date())));
  if (entry.url) lines.push(M.line(L.link, M.jump(entry.url)));
  return lines.join("\n");
}

export class CommandLogService {
  async resolveChannelId(guildId: string, slot: ChannelConfigType): Promise<ChannelId | null> {
    const own = await channelConfigService.getChannelId(guildId, slot);
    if (own || slot === ChannelConfigType.COMMAND_LOG) return own;
    return channelConfigService.getChannelId(guildId, ChannelConfigType.COMMAND_LOG);
  }

  /** Never throws — a broken log room must not break the command. */
  async record(guild: Guild, entry: CommandLogEntry): Promise<void> {
    try {
      const channelId = await this.resolveChannelId(guild.id, entry.slot);
      if (!channelId) return;

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        log.warn(`${entry.slot} channel ${channelId} unavailable in ${guild.id}`);
        return;
      }
      // The text already carries its own time line, so the card doesn't add another.
      await channel.send(logCardFromText(buildCommandLog(entry), OUTCOME_TONE[entry.outcome], { at: null }));
    } catch (err) {
      log.warn(`command log post failed in ${guild.id}`, err);
    }
  }
}

export const commandLogService = new CommandLogService();
