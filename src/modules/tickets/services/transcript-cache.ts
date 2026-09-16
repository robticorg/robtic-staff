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

/**
 * Real-time per-ticket-channel message buffer. Messages are captured as they
 * arrive (bot messages included — the embeds a bot posts are part of the
 * conversation too), so the transcript no longer depends on paginating
 * channel history at close time, which misses embeds and is capped.
 *
 * In-memory only: `track()` is re-run for every still-open ticket on bot
 * startup (see events/ready.ts) so a restart doesn't leave a channel silently
 * untracked — `generate()` falls back to a live history fetch regardless if
 * the cache ever comes up empty.
 */
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

  /** Returns and stops tracking a channel's buffered messages. */
  flush(channelId: string): CachedTranscriptMessage[] {
    const list = this.byChannel.get(channelId) ?? [];
    this.untrack(channelId);
    return list;
  }
}

export const transcriptCache = new TranscriptCache();
