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
import { memberIsAdministrator } from "../tickets/services/ticket-permissions.ts";
import { detectFastAccessContext, type DetectedContext } from "./context-detect.ts";

const log = logger.child("fast-access");

export interface ExecuteFastAccessInput {
  guildId: string;
  channelId: string;
  member: GuildMember;
  command: string;
  sourceMessageId: string;
  args?: string;
  replyToMessageId?: string | null;
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

    const detected = await detectFastAccessContext(input.channelId, input.guildId);
    const isPublic = entry.contextType === FastAccessContext.PUBLIC;
    if (!isFastAccessAllowedIn(entry.contextType, detected?.context ?? null)) {
      return { delivered: false, reason: "WRONG_CONTEXT" };
    }

    const denied = detected
      ? await this.authorize(input.member, detected)
      : (await staffPermissionService.canActAsStaff(input.member))
        ? null
        : "NOT_STAFF";
    if (denied) return { delivered: false, reason: denied };

    const channel = await input.member.guild.channels.fetch(input.channelId).catch(() => null);
    if (!channel) return { delivered: false, reason: "WRONG_CONTEXT" };

    const content = fillFastAccessArgs(entry.message, input.args ?? "");
    const reply = input.replyToMessageId
      ? { messageReference: { messageId: input.replyToMessageId, failIfNotExists: false } }
      : {};

    if (!detected) {
      if (!("send" in channel)) return { delivered: false, reason: "WRONG_CONTEXT" };
      await channel
        .send({ content, allowedMentions: { parse: [] }, ...reply })
        .catch((err) => log.warn("fast-access public send failed", err));
      return { delivered: true, context: FastAccessContext.PUBLIC };
    }

    if (detected.ticket) {
      if ("send" in channel) {
        await channel
          .send({ content, allowedMentions: { parse: [] }, ...reply })
          .catch((err) => log.warn("fast-access support send failed", err));
      }
      return { delivered: true, context: isPublic ? FastAccessContext.PUBLIC : detected.context };
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
      content,
      attachments: [],
      sourceMessageId: input.sourceMessageId,
      thread: channel,
    });
    return { delivered: true, context: isPublic ? FastAccessContext.PUBLIC : detected.context };
  }

  private async authorize(
    member: GuildMember,
    detected: DetectedContext,
  ): Promise<"NOT_STAFF" | "NO_PERMISSION" | null> {
    const ticket = detected.ticket;
    if (ticket && ticket.claimableRoles.length > 0) {
      const allowed =
        memberIsAdministrator(member) ||
        ticket.claimedByDiscordId === member.id ||
        ticket.claimableRoles.some(
          (slot) => slot.claimedBy === member.id || member.roles.cache.has(slot.roleId),
        );
      return allowed ? null : "NO_PERMISSION";
    }
    return (await staffPermissionService.canActAsStaff(member)) ? null : "NOT_STAFF";
  }
}

const ARGS_PLACEHOLDER = /\[args\]/gi;
const MAX_CONTENT_LENGTH = 2000;

export function fillFastAccessArgs(template: string, args: string): string {
  const filled = template.replace(ARGS_PLACEHOLDER, () => args.trim()).trim();
  return filled.length > MAX_CONTENT_LENGTH ? filled.slice(0, MAX_CONTENT_LENGTH) : filled;
}

export function fastAccessArgs(content: string, prefix: string, token: string): string {
  return content.slice(prefix.length).trimStart().slice(token.length).trim();
}

export function isFastAccessAllowedIn(
  macroContext: FastAccessContext,
  channelContext: FastAccessContext | null,
): boolean {
  if (macroContext === FastAccessContext.PUBLIC) return true;
  return channelContext === macroContext;
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

  const replyToMessageId = message.reference?.messageId ?? null;
  let args = fastAccessArgs(message.content, prefix, token);
  if (!args && replyToMessageId) {
    const replied = await message.channel.messages.fetch(replyToMessageId).catch(() => null);
    args = replied?.content ?? "";
  }

  try {
    await fastAccessRunner.execute({
      guildId: message.guild.id,
      channelId: message.channel.id,
      member,
      command: token,
      sourceMessageId: message.id,
      args,
      replyToMessageId,
    });
  } catch (err) {
    log.error("fast-access execution failed", err);
  }
  return true;
}
