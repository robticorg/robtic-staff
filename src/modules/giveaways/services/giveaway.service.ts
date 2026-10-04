import { ChannelType, type Guild, type Message } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { DomainError, isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { giveawayConfig } from "../../../data/giveaways/config.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { GiveawayModel, GiveawayStatus, type GiveawayDocument } from "../models/giveaway.model.ts";
import { GiveawayProofModel } from "../models/giveaway-proof.model.ts";
import { buildGiveawayResult } from "../render/result.ts";
import { isWinnerMessageFor, mentionedUserIds, parseEndsAt } from "./giveaway-parse.ts";

const log = logger.child("giveaways");
const G = giveawayMessages.giveaway;

export class GiveawayError extends DomainError {}

const textsOf = (message: Message): string[] =>
  [
    message.content,
    ...message.embeds.flatMap((embed) => [
      embed.title ?? "",
      embed.description ?? "",
      ...embed.fields.map((field) => field.value),
    ]),
  ].filter(Boolean);

export class GiveawayService {
  private async findMessage(guild: Guild, messageId: string, preferredChannelId: string): Promise<Message | null> {
    const preferred = await guild.channels.fetch(preferredChannelId).catch(() => null);
    if (preferred?.isTextBased()) {
      const found = await preferred.messages.fetch(messageId).catch(() => null);
      if (found) return found;
    }
    const channels = await guild.channels.fetch().catch(() => null);
    for (const channel of channels?.values() ?? []) {
      if (!channel || channel.id === preferredChannelId) continue;
      if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) continue;
      const found = await channel.messages.fetch(messageId).catch(() => null);
      if (found) return found;
    }
    return null;
  }

  async register(input: {
    guild: Guild;
    messageId: string;
    channelId: string;
    actorId: UserId;
    now?: Date;
  }): Promise<GiveawayDocument> {
    const now = input.now ?? new Date();
    const message = await this.findMessage(input.guild, input.messageId, input.channelId);
    if (!message) throw new GiveawayError("GIVEAWAY_NOT_FOUND", G.notFound);
    if (!message.author.bot) throw new GiveawayError("GIVEAWAY_NOT_BOT", G.notBot);
    if (message.embeds.length === 0) throw new GiveawayError("GIVEAWAY_NO_EMBED", G.noEmbed);

    const endsAt = parseEndsAt(
      message.embeds.map((embed) => ({
        description: embed.description,
        title: embed.title,
        timestamp: embed.timestamp,
        fields: embed.fields,
      })),
    );
    if (!endsAt) throw new GiveawayError("GIVEAWAY_NO_END", G.noEndTime);
    if (endsAt <= now) throw new GiveawayError("GIVEAWAY_ENDED", G.alreadyEnded);

    try {
      return await GiveawayModel.create({
        guildId: input.guild.id,
        channelId: message.channelId,
        messageId: message.id,
        botId: message.author.id,
        endsAt,
        createdBy: input.actorId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new GiveawayError("GIVEAWAY_DUPLICATE", G.alreadyRegistered);
      throw err;
    }
  }

  async target(guildId: GuildId, messageId: string | null, now: Date = new Date()): Promise<GiveawayDocument | null> {
    const open = {
      guildId,
      status: GiveawayStatus.ACTIVE,
      endsAt: { $gt: new Date(now.getTime() - giveawayConfig.resultWindowMs) },
    };
    if (messageId) return GiveawayModel.findOne({ ...open, messageId }).exec();
    return GiveawayModel.findOne(open).sort({ createdAt: -1 }).exec();
  }

  async markDone(giveaway: GiveawayDocument, userId: UserId, provedBy: UserId): Promise<boolean> {
    try {
      await GiveawayProofModel.create({ giveawayId: giveaway.giveawayId, guildId: giveaway.guildId, userId, provedBy });
      return true;
    } catch (err) {
      if (isDuplicateKeyError(err)) return false;
      throw err;
    }
  }

  async handleBotMessage(message: Message<true>, now: Date = new Date()): Promise<boolean> {
    const candidates = await GiveawayModel.find({
      channelId: message.channelId,
      botId: message.author.id,
      endsAt: {
        $gte: new Date(now.getTime() - giveawayConfig.resultWindowMs),
        $lte: new Date(now.getTime() + giveawayConfig.earlyEndToleranceMs),
      },
    })
      .sort({ endsAt: 1 })
      .exec();
    if (candidates.length === 0) return false;

    const referencedMessageId = message.reference?.messageId ?? null;
    const facts = {
      authorId: message.author.id,
      channelId: message.channelId,
      messageId: message.id,
      referencedMessageId,
      texts: textsOf(message),
      at: now,
    };
    const options = {
      earlyToleranceMs: giveawayConfig.earlyEndToleranceMs,
      windowMs: giveawayConfig.resultWindowMs,
    };
    const giveaway = candidates.find(
      (candidate) =>
        isWinnerMessageFor(facts, candidate, options) &&
        (referencedMessageId !== null || candidate.status === GiveawayStatus.ACTIVE),
    );
    if (!giveaway) return false;

    const winners = mentionedUserIds(facts.texts, new Set([message.author.id, message.client.user.id]));
    if (winners.length === 0) return false;

    await GiveawayModel.updateOne(
      { giveawayId: giveaway.giveawayId },
      { $set: { status: GiveawayStatus.ENDED, winners, endedAt: now } },
    ).exec();

    const proofs = await GiveawayProofModel.find({ giveawayId: giveaway.giveawayId }).exec();
    const proofByUser = new Map(proofs.map((proof) => [proof.userId, proof.provedBy]));
    await message
      .reply(
        buildGiveawayResult(
          winners.map((userId) => ({ userId, provedBy: proofByUser.get(userId) ?? null })),
          proofs.length,
        ),
      )
      .catch((err) => log.warn(`giveaway ${giveaway.giveawayId} result post failed`, err));
    log.info(`giveaway ${giveaway.giveawayId} ended — ${winners.length} winner(s), ${proofs.length} proof(s)`);
    return true;
  }
}

export const giveawayService = new GiveawayService();
