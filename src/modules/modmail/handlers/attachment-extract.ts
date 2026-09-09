import type { Message } from "discord.js";
import type { IncomingAttachment } from "../services/attachment.service.ts";

export function extractAttachments(message: Message): IncomingAttachment[] {
  return [...message.attachments.values()].map((a) => ({
    attachmentId: a.id,
    url: a.url,
    filename: a.name ?? "attachment",
    contentType: a.contentType ?? undefined,
    size: a.size ?? undefined,
    uploadedBy: message.author.id,
  }));
}
