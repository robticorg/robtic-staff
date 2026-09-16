import { AttachmentBuilder, type Guild, type GuildTextBasedChannel } from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { createEmbed } from "../../../data/embeds/index.ts";
import { isUnsetId } from "../../../data/tickets/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import type { Ticket } from "../models/ticket.model.ts";
import {
  TicketTranscriptModel,
  type TicketTranscriptDocument,
} from "../models/ticket-transcript.model.ts";
import { renderTranscriptText } from "../render/transcript-text.ts";
import { TranscriptFormat } from "../types/enums.ts";
import { ticketConfigService } from "./ticket-config.service.ts";
import { transcriptCache, type CachedTranscriptMessage } from "./transcript-cache.ts";

const log = logger.child("tickets:transcript");

export interface TranscriptPayload {
  ticket: {
    ticketId: string;
    panelId: string;
    guildId: string;
    channelId: string;
    ownerId: string;
    claimedByDiscordId?: string;
    status: string;
    createdAt: string;
    claimedAt?: string;
    closedAt?: string;
  };
  questions: { questionId: string; question: string; answer: string }[];
  participants: string[];
  messages: CachedTranscriptMessage[];
}

export class TranscriptService {
  async generate(
    ticket: Ticket,
    channel: GuildTextBasedChannel | null,
  ): Promise<TicketTranscriptDocument> {
    const payload: TranscriptPayload = {
      ticket: {
        ticketId: ticket.ticketId,
        panelId: ticket.panelId,
        guildId: ticket.guildId,
        channelId: ticket.channelId,
        ownerId: ticket.userId,
        claimedByDiscordId: ticket.claimedByDiscordId,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        claimedAt: ticket.claimedAt?.toISOString(),
        closedAt: ticket.closedAt?.toISOString(),
      },
      questions: ticket.answers.map((a) => ({
        questionId: a.questionId,
        question: a.question,
        answer: a.answer,
      })),
      participants: unique([ticket.userId, ...(ticket.claimedByDiscordId ? [ticket.claimedByDiscordId] : []), ...ticket.addedUsers]),
      messages: [],
    };

    // The live cache (captured message-by-message, embeds included) is the
    // primary source — it survives the channel being deleted right after.
    // A history fetch only runs as a fallback, e.g. after a bot restart
    // dropped the tracked buffer for a still-open ticket.
    const cached = transcriptCache.flush(ticket.channelId);
    if (cached.length > 0) {
      payload.messages = cached;
    } else if (channel) {
      try {
        payload.messages = await this.collectMessages(channel);
      } catch (err) {
        log.warn("transcript message collection failed", err);
      }
    }

    for (const m of payload.messages) {
      if (!payload.participants.includes(m.authorId)) payload.participants.push(m.authorId);
    }

    return TicketTranscriptModel.create({
      ticketId: ticket.ticketId,
      guildId: ticket.guildId,
      format: TranscriptFormat.JSON,
      content: JSON.stringify(payload),
      messageCount: payload.messages.length,
    });
  }

  get(transcriptId: string): Promise<TicketTranscriptDocument | null> {
    return TicketTranscriptModel.findOne({ transcriptId }).exec();
  }

  /**
   * Posts the transcript (a readable .txt rendering, plus a summary embed)
   * into the channel configured at `ticketMain.transcriptChannelId`. A no-op
   * when that's left as the unset placeholder.
   */
  async sendToChannel(guild: Guild, transcript: TicketTranscriptDocument): Promise<void> {
    try {
      const main = ticketConfigService.getMainConfig();
      if (isUnsetId(main.transcriptChannelId)) return;

      const channel = await guild.channels.fetch(main.transcriptChannelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        log.warn("transcript channel unavailable");
        return;
      }

      const payload = JSON.parse(transcript.content) as TranscriptPayload;
      const file = new AttachmentBuilder(Buffer.from(renderTranscriptText(payload), "utf-8"), {
        name: `${transcript.ticketId}-transcript.txt`,
      });

      const embed = createEmbed({
        title: `📄 ${transcript.ticketId}`,
        color: "info",
        fields: [
          { name: "العضو", value: `<@${payload.ticket.ownerId}>`, inline: true },
          ...(payload.ticket.claimedByDiscordId
            ? [{ name: "استلمه", value: `<@${payload.ticket.claimedByDiscordId}>`, inline: true }]
            : []),
          { name: "القسم", value: payload.ticket.panelId, inline: true },
          { name: "عدد الرسائل", value: String(transcript.messageCount), inline: true },
        ],
        timestamp: true,
      });

      await channel.send({ embeds: [embed], files: [file] });
    } catch (err) {
      log.warn("transcript send failed", err);
    }
  }

  private async collectMessages(
    channel: GuildTextBasedChannel,
  ): Promise<CachedTranscriptMessage[]> {
    const out: CachedTranscriptMessage[] = [];
    let before: string | undefined;

    while (out.length < limits.transcriptMessageCap) {
      const batch = await channel.messages.fetch({ limit: 100, before });
      if (batch.size === 0) break;
      for (const msg of batch.values()) {
        out.push({
          id: msg.id,
          authorId: msg.author.id,
          authorTag: msg.author.tag,
          bot: msg.author.bot,
          content: msg.content,
          embeds: msg.embeds.map((e) => e.toJSON()),
          attachments: [...msg.attachments.values()].map((a) => ({
            name: a.name ?? "attachment",
            url: a.url,
          })),
          createdAt: new Date(msg.createdTimestamp).toISOString(),
        });
      }
      before = batch.last()?.id;
      if (!before || batch.size < 100) break;
    }

    return out.reverse();
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export const transcriptService = new TranscriptService();
