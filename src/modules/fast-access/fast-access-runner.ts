import type { GuildMember, Message } from "discord.js";
import { config } from "../../config/index.ts";
import { logger } from "../../shared/utils/logger.ts";
import {
  fastAccessService,
  tryNormaliseFastAccessCommand,
} from "../configuration/services/fast-access.service.ts";
import { FastAccessContext } from "../configuration/types/enums.ts";
import { modmailCaseService } from "../modmail/services/modmail-case.service.ts";
import { modmailService } from "../modmail/services/modmail.service.ts";
import { reportPermissionService } from "../modmail/services/report-permissions.service.ts";
import { staffPermissionService } from "../staff/services/staff-permissions.service.ts";
import { detectFastAccessContext } from "./context-detect.ts";

const log = logger.child("fast-access");

export interface ExecuteFastAccessInput {
  guildId: string;
  channelId: string;
  member: GuildMember;
  command: string;
  sourceMessageId: string;
}

export type ExecuteOutcome =
  | { delivered: true; context: FastAccessContext }
  | { delivered: false; reason: "UNKNOWN" | "DISABLED" | "NOT_STAFF" | "WRONG_CONTEXT" | "NO_PERMISSION" };

class FastAccessRunner {
  async execute(input: ExecuteFastAccessInput): Promise<ExecuteOutcome> {
    const name = tryNormaliseFastAccessCommand(input.command);
    if (!name) return { delivered: false, reason: "UNKNOWN" };

    const entry = await fastAccessService.getByCommand(input.guildId, name);
    if (!entry) return { delivered: false, reason: "UNKNOWN" };
    if (!entry.enabled) return { delivered: false, reason: "DISABLED" };

    if (!(await staffPermissionService.isStaff(input.member))) {
      return { delivered: false, reason: "NOT_STAFF" };
    }

    const detected = await detectFastAccessContext(input.channelId, input.guildId);
    if (!detected || detected.context !== entry.contextType) {
      return { delivered: false, reason: "WRONG_CONTEXT" };
    }

    const channel = await input.member.guild.channels.fetch(input.channelId).catch(() => null);
    if (!channel) return { delivered: false, reason: "WRONG_CONTEXT" };

    if (detected.context === FastAccessContext.SUPPORT) {
      if ("send" in channel) {
        await channel
          .send({ content: entry.message, allowedMentions: { parse: [] } })
          .catch((err) => log.warn("fast-access support send failed", err));
      }
      return { delivered: true, context: detected.context };
    }

    const kase = await modmailCaseService.getByCaseId(detected.referenceId);
    if (!kase) return { delivered: false, reason: "WRONG_CONTEXT" };
    if (!(await reportPermissionService.canManageReport(input.member, kase))) {
      return { delivered: false, reason: "NO_PERMISSION" };
    }
    if (!channel.isThread()) return { delivered: false, reason: "WRONG_CONTEXT" };

    await modmailService.relayStaffToUser({
      caseId: kase.caseId,
      member: input.member,
      content: entry.message,
      attachments: [],
      sourceMessageId: input.sourceMessageId,
      thread: channel,
    });
    return { delivered: true, context: detected.context };
  }
}

export const fastAccessRunner = new FastAccessRunner();

export async function runFastAccess(message: Message): Promise<boolean> {
  if (message.author.bot || !message.inGuild()) return false;

  const prefix = config.fastAccessPrefix;
  if (!message.content.startsWith(prefix)) return false;

  const token = message.content.slice(prefix.length).trimStart().split(/\s+/, 1)[0];
  if (!token) return true;

  const member =
    message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) return true;

  try {
    await fastAccessRunner.execute({
      guildId: message.guild.id,
      channelId: message.channel.id,
      member,
      command: token,
      sourceMessageId: message.id,
    });
  } catch (err) {
    log.error("fast-access execution failed", err);
  }
  return true;
}
