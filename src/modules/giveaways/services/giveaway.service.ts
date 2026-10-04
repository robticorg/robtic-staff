import type { Guild, Message } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { DomainError, isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { giveawayConfig } from "../../../data/giveaways/config.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { GiveawayModel, GiveawayStatus, type GiveawayDocument } from "../models/giveaway.model.ts";
import { GiveawayProofModel } from "../models/giveaway-proof.model.ts";
import { buildGiveawayResult } from "../render/result.ts";
import {
  findGiveawayMessage,
  giveawayTitle,
  messageTexts,
  type GiveawayMessageRef,
} from "./giveaway-message.ts";
import { findEndTime, isWinnerMessageFor, mentionedUserIds } from "./giveaway-parse.ts";

const log = logger.child("giveaways");
const G = giveawayMessages.giveaway;

export class GiveawayError extends DomainError {}

const textsOf = (message: Message): string[] => messageTexts(message);

export class GiveawayService {
  async register(input: {
    guild: Guild;
    ref: GiveawayMessageRef;
    channelId: string;
    actorId: UserId;
    now?: Date;
  }): Promise<GiveawayDocument> {
    const now = input.now ?? new Date();
    const message = await findGiveawayMessage(input.guild, input.ref, input.channelId);
    if (!message) {
      log.info(`giveaway message ${input.ref.messageId} not found (channel hint ${input.ref.channelId ?? "none"})`);
      throw new GiveawayError("GIVEAWAY_NOT_FOUND", G.notFound);
    }
    if (!message.author.bot) throw new GiveawayError("GIVEAWAY_NOT_BOT", G.notBot);

    const texts = textsOf(message);
    const endsAt = findEndTime({
      texts,
      embedTimestamps: message.embeds.map((embed) => embed.timestamp),
      now,
    });
    if (!endsAt) {
      log.warn(
        `giveaway ${message.id}: no end time — embeds=${message.embeds.length} components=${message.components.length} ` +
          `text=${JSON.stringify(texts.join(" | ").slice(0, 400))}`,
      );
      throw new GiveawayError("GIVEAWAY_NO_END", G.noEndTime);
    }
    if (endsAt <= now) throw new GiveawayError("GIVEAWAY_ENDED", G.alreadyEnded);

    try {
      return await GiveawayModel.create({
        guildId: input.guild.id,
        channelId: message.channelId,
        messageId: message.id,
        botId: message.author.id,
        title: giveawayTitle(message),
        endsAt,
        createdBy: input.actorId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new GiveawayError("GIVEAWAY_DUPLICATE", G.alreadyRegistered);
      throw err;
    }
  }

  private openFilter(guildId: GuildId, now: Date) {
    return {
      guildId,
      status: GiveawayStatus.ACTIVE,
      endsAt: { $gt: new Date(now.getTime() - giveawayConfig.resultWindowMs) },
    };
  }

  listActive(guildId: GuildId, now: Date = new Date()): Promise<GiveawayDocument[]> {
    return GiveawayModel.find(this.openFilter(guildId, now)).sort({ endsAt: 1 }).limit(25).exec();
  }

  async target(guildId: GuildId, messageId: string | null, now: Date = new Date()): Promise<GiveawayDocument | null> {
    if (messageId) return GiveawayModel.findOne({ ...this.openFilter(guildId, now), messageId }).exec();
    return GiveawayModel.findOne(this.openFilter(guildId, now)).sort({ createdAt: -1 }).exec();
  }

  byId(guildId: GuildId, giveawayId: string, now: Date = new Date()): Promise<GiveawayDocument | null> {
    return GiveawayModel.findOne({ ...this.openFilter(guildId, now), giveawayId }).exec();
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
