import { ChannelType, type Message } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { modmailCaseService } from "../services/modmail-case.service.ts";
import { modmailService } from "../services/modmail.service.ts";
import { extractAttachments } from "./attachment-extract.ts";

const log = logger.child("modmail:thread");

export async function handleThreadMessage(message: Message): Promise<void> {
  if (message.author.bot || !message.inGuild()) return;

  const channel = message.channel;
  if (
    channel.type !== ChannelType.PublicThread &&
    channel.type !== ChannelType.PrivateThread &&
    channel.type !== ChannelType.AnnouncementThread
  ) {
    return;
  }

  const kase = await modmailCaseService.getByThreadId(channel.id);
  if (!kase) return;

  let member = message.member;
  if (!member) {
    member = await message.guild.members.fetch(message.author.id).catch(() => null);
  }
  if (!member) return;

  try {
    await modmailService.relayStaffToUser({
      caseId: kase.caseId,
      member,
      content: message.content ?? "",
      attachments: extractAttachments(message),
      sourceMessageId: message.id,
      thread: channel,
    });
  } catch (err) {
    log.error("staff→user relay failed", err);
  }
}
