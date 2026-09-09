import { type GuildTextBasedChannel } from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { logger } from "../../../shared/utils/logger.ts";
import type { Ticket } from "../models/ticket.model.ts";
import {
  TicketTranscriptModel,
  type TicketTranscriptDocument,
} from "../models/ticket-transcript.model.ts";
import { TranscriptFormat } from "../types/enums.ts";

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
  messages: {
    id: string;
    authorId: string;
    authorTag: string;
    bot: boolean;
    content: string;
    attachments: { name: string; url: string }[];
    createdAt: string;
  }[];
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

    if (channel) {
      try {
        payload.messages = await this.collectMessages(channel);
        for (const m of payload.messages) {
          if (!payload.participants.includes(m.authorId)) payload.participants.push(m.authorId);
        }
      } catch (err) {
        log.warn("transcript message collection failed", err);
      }
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

  private async collectMessages(
    channel: GuildTextBasedChannel,
  ): Promise<TranscriptPayload["messages"]> {
    const out: TranscriptPayload["messages"] = [];
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
