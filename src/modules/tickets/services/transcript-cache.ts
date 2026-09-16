import type { Message } from "discord.js";
import { limits } from "../../../data/config/limits.ts";

export interface CachedTranscriptMessage {
  id: string;
  authorId: string;
  authorTag: string;
  bot: boolean;
  content: string;
  embeds: unknown[];
  attachments: { name: string; url: string }[];
  createdAt: string;
}

class TranscriptCache {
  private readonly byChannel = new Map<string, CachedTranscriptMessage[]>();

  track(channelId: string): void {
    if (!this.byChannel.has(channelId)) this.byChannel.set(channelId, []);
  }

  untrack(channelId: string): void {
    this.byChannel.delete(channelId);
  }

  isTracked(channelId: string): boolean {
    return this.byChannel.has(channelId);
  }

  record(message: Message): void {
    const list = this.byChannel.get(message.channel.id);
    if (!list) return;

    list.push({
      id: message.id,
      authorId: message.author.id,
      authorTag: message.author.tag,
      bot: message.author.bot,
      content: message.content,
      embeds: message.embeds.map((e) => e.toJSON()),
      attachments: [...message.attachments.values()].map((a) => ({
        name: a.name ?? "attachment",
        url: a.url,
      })),
      createdAt: new Date(message.createdTimestamp).toISOString(),
    });
    if (list.length > limits.transcriptMessageCap) list.shift();
  }

  flush(channelId: string): CachedTranscriptMessage[] {
    const list = this.byChannel.get(channelId) ?? [];
    this.untrack(channelId);
    return list;
  }
}

export const transcriptCache = new TranscriptCache();
