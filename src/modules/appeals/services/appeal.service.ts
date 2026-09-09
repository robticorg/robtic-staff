import { ChannelType, type GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import {
  ConflictError,
  DomainError,
  isDuplicateKeyError,
} from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { appealConfig } from "../../../data/appeals/config.ts";
import { appealMessages } from "../../../data/appeals/messages.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { modmailCaseService } from "../../modmail/services/modmail-case.service.ts";
import { punishmentAuditService } from "../../punishment/services/punishment-audit.service.ts";
import { punishmentService } from "../../punishment/services/punishment.service.ts";
import { PunishmentAuditAction, PunishmentStatus, PunishmentType } from "../../punishment/types/enums.ts";
import type { PunishmentDocument } from "../../punishment/models/punishment.model.ts";
import { APPEAL_SUCCESS_PENALTY } from "../../staff/config/points.ts";
import {
  StaffActivityType,
  StaffHistoryAction,
  StaffPointTransactionType,
  staffActivityService,
  staffHistoryService,
  staffPointService,
  staffService,
} from "../../staff/index.ts";
import { AppealModel, type Appeal, type AppealDocument } from "../models/appeal.model.ts";
import { buildAppealReviewCard } from "../render/review-card.ts";
import { AppealStatus, DECIDABLE_APPEAL_STATUSES } from "../types/enums.ts";
import { appealPermissionService, isReviewerConflicted } from "./appeal-permissions.service.ts";
import { requireAppealClient } from "../runtime.ts";

const log = logger.child("appeal");
const M = appealMessages;

export class AppealError extends DomainError {}

export interface CanAppealInput {
  userId: UserId;
  guildId?: GuildId;
  punishmentId: string;
}

export type CanAppealResult =
  | { ok: true; punishment: PunishmentDocument }
  | { ok: false; message: string };

export interface CreateAppealInput {
  userId: UserId;
  punishmentId: string;
  reason: string;
  evidence?: string[];
}

export interface DecisionInput {
  appealId: string;
  reviewer: GuildMember;
  decisionReason: string;
}

export class AppealService extends BaseRepository<Appeal> {
  constructor() {
    super(AppealModel);
  }

  getAppeal(appealId: string): Promise<AppealDocument | null> {
    return this.findOne({ appealId });
  }

  async getAppealOrThrow(appealId: string): Promise<AppealDocument> {
    const appeal = await this.getAppeal(appealId);
    if (!appeal) throw new AppealError("APPEAL_GONE", M.review.gone);
    return appeal;
  }

  getPunishmentAppeal(punishmentId: string): Promise<AppealDocument | null> {
    return this.findOne({ punishmentId });
  }

  getUserAppeals(userId: UserId, guildId: GuildId): Promise<AppealDocument[]> {
    return AppealModel.find({ userId, guildId }).sort({ createdAt: -1 }).exec();
  }

  async canAppeal(input: CanAppealInput): Promise<CanAppealResult> {
    const punishment = await punishmentService.getPunishment(input.punishmentId);
    if (!punishment) return { ok: false, message: M.dm.punishmentGone };
    if (punishment.userId !== input.userId) return { ok: false, message: M.dm.notYours };
    if (input.guildId && punishment.guildId !== input.guildId) {
      return { ok: false, message: M.dm.notYours };
    }
    if (
      punishment.status !== PunishmentStatus.EXECUTED ||
      punishment.type === PunishmentType.NO_ACTION
    ) {
      return { ok: false, message: M.dm.notEligible };
    }

    const existing = await this.getPunishmentAppeal(input.punishmentId);
    if (existing) {
      if ((DECIDABLE_APPEAL_STATUSES as AppealStatus[]).includes(existing.status)) {
        return { ok: false, message: M.dm.alreadyAppealedPending };
      }
      if (existing.status !== AppealStatus.CANCELLED) {
        return { ok: false, message: M.dm.alreadyAppealedDecided(existing.status) };
      }
    }

    return { ok: true, punishment };
  }

  async createAppeal(input: CreateAppealInput): Promise<{ appeal: AppealDocument }> {
    const eligibility = await this.canAppeal({
      userId: input.userId,
      punishmentId: input.punishmentId,
    });
    if (!eligibility.ok) throw new AppealError("APPEAL_NOT_ELIGIBLE", eligibility.message);
    const punishment = eligibility.punishment;

    const reason = input.reason.trim();
    if (!reason) throw new AppealError("APPEAL_REASON_REQUIRED", M.dm.reasonRequired);

    const channelId = await channelConfigService.getChannelId(
      punishment.guildId,
      ChannelConfigType.APPEALS,
    );
    if (!channelId) {
      log.error(`APPEALS channel not configured for guild ${punishment.guildId}`);
      throw new AppealError("APPEAL_CHANNEL_UNSET", M.dm.systemUnavailable);
    }
    const channel = await requireAppealClient().channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      log.error(`APPEALS channel unavailable for guild ${punishment.guildId}`);
      throw new AppealError("APPEAL_CHANNEL_BAD", M.dm.systemUnavailable);
    }

    const evidence = (input.evidence ?? [])
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, appealConfig.maxEvidence);

    let appeal: AppealDocument;
    try {
      appeal = await AppealModel.create({
        guildId: punishment.guildId,
        userId: input.userId,
        punishmentId: punishment.punishmentId,
        reason: reason.slice(0, appealConfig.maxReasonLength),
        evidence,
        status: AppealStatus.PENDING,
        submittedAt: new Date(),
        channelId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await this.getPunishmentAppeal(input.punishmentId);
        throw new AppealError(
          "APPEAL_DUPLICATE",
          existing && (DECIDABLE_APPEAL_STATUSES as AppealStatus[]).includes(existing.status)
            ? M.dm.alreadyAppealedPending
            : M.dm.alreadyAppealedDecided(existing?.status ?? "decided"),
        );
      }
      throw err;
    }

    try {
      const message = await channel.send(buildAppealReviewCard(appeal, punishment));
      appeal.messageId = message.id;
      await appeal.save();
    } catch (err) {
      await AppealModel.deleteOne({ _id: appeal._id }).exec();
      log.error(`failed to post appeal ${appeal.appealId} review card`, err);
      throw new AppealError("APPEAL_CHANNEL_BAD", M.dm.systemUnavailable);
    }

    await punishmentAuditService.record({
      punishmentId: punishment.punishmentId,
      action: PunishmentAuditAction.APPEAL_SUBMITTED,
      actorId: input.userId,
      metadata: { appealId: appeal.appealId },
    });

    return { appeal };
  }

  async claimAppeal(appealId: string, reviewer: GuildMember): Promise<{ appeal: AppealDocument }> {
    const appeal = await this.getAppealOrThrow(appealId);
    if (appeal.guildId !== reviewer.guild.id) throw new AppealError("APPEAL_GONE", M.review.gone);

    await this.assertCanReview(appeal, reviewer);

    if (appeal.status !== AppealStatus.PENDING) {
      if (appeal.claimedBy) {
        throw new ConflictError(M.review.alreadyClaimed(appeal.claimedBy));
      }
      throw new ConflictError(M.review.alreadyDecided);
    }

    const claimed = await AppealModel.findOneAndUpdate(
      { appealId, status: AppealStatus.PENDING },
      { $set: { status: AppealStatus.CLAIMED, claimedBy: reviewer.id, claimedAt: new Date() } },
      { returnDocument: "after" },
    ).exec();
    if (!claimed) throw new ConflictError(M.review.alreadyClaimed(appeal.claimedBy ?? "someone"));

    const staff = await staffService.ensure(reviewer.id, appeal.guildId);
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.APPEAL_CLAIM,
      referenceId: appeal.appealId,
      metadata: { punishmentId: appeal.punishmentId },
    });
    await punishmentAuditService.record({
      punishmentId: appeal.punishmentId,
      action: PunishmentAuditAction.APPEAL_CLAIMED,
      actorId: reviewer.id,
      metadata: { appealId: appeal.appealId },
    });

    await this.refreshCard(appealId);
    return { appeal: claimed };
  }

  async acceptAppeal(input: DecisionInput): Promise<{ appeal: AppealDocument; reversalPartial: boolean }> {
    const { appeal, punishment } = await this.prepareDecision(input);

    const decided = await AppealModel.findOneAndUpdate(
      { appealId: appeal.appealId, status: { $in: DECIDABLE_APPEAL_STATUSES as AppealStatus[] } },
      {
        $set: {
          status: AppealStatus.ACCEPTED,
          reviewedBy: input.reviewer.id,
          reviewedAt: new Date(),
          decisionReason: input.decisionReason,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!decided) throw new ConflictError(M.review.alreadyDecided);

    const reversal = await punishmentService.reversePunishment(punishment.punishmentId, {
      actorId: input.reviewer.id,
      reason: input.decisionReason,
      appealId: appeal.appealId,
    });
    if (reversal.reversalError) {
      await AppealModel.updateOne(
        { _id: decided._id },
        { $set: { reversalError: reversal.reversalError } },
      ).exec();
    }

    const staff = await staffService.ensure(input.reviewer.id, appeal.guildId);
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.APPEAL_ACCEPTED,
      referenceId: appeal.appealId,
      metadata: { punishmentId: punishment.punishmentId },
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.PUNISHMENT_REVOKED,
      referenceId: punishment.punishmentId,
      metadata: { appealId: appeal.appealId },
    });
    await punishmentAuditService.record({
      punishmentId: punishment.punishmentId,
      action: PunishmentAuditAction.APPEAL_ACCEPTED,
      actorId: input.reviewer.id,
      metadata: { appealId: appeal.appealId },
    });

    if (punishment.type === PunishmentType.WARN) {
      await this.applyWarningPenalty(decided, punishment);
    }

    await this.refreshCard(appeal.appealId);
    await this.dmAppellant(appeal.userId, punishment, input.decisionReason, "accepted");

    return { appeal: decided, reversalPartial: !reversal.discordReversed };
  }

  async rejectAppeal(input: DecisionInput): Promise<{ appeal: AppealDocument }> {
    const { appeal, punishment } = await this.prepareDecision(input);

    const decided = await AppealModel.findOneAndUpdate(
      { appealId: appeal.appealId, status: { $in: DECIDABLE_APPEAL_STATUSES as AppealStatus[] } },
      {
        $set: {
          status: AppealStatus.REJECTED,
          reviewedBy: input.reviewer.id,
          reviewedAt: new Date(),
          decisionReason: input.decisionReason,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!decided) throw new ConflictError(M.review.alreadyDecided);

    const staff = await staffService.ensure(input.reviewer.id, appeal.guildId);
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.APPEAL_REJECTED,
      referenceId: appeal.appealId,
      metadata: { punishmentId: punishment.punishmentId },
    });
    await punishmentAuditService.record({
      punishmentId: punishment.punishmentId,
      action: PunishmentAuditAction.APPEAL_REJECTED,
      actorId: input.reviewer.id,
      metadata: { appealId: appeal.appealId },
    });

    await this.refreshCard(appeal.appealId);
    await this.dmAppellant(appeal.userId, punishment, input.decisionReason, "rejected");

    return { appeal: decided };
  }

  private async prepareDecision(
    input: DecisionInput,
  ): Promise<{ appeal: AppealDocument; punishment: PunishmentDocument }> {
    const appeal = await this.getAppealOrThrow(input.appealId);
    if (appeal.guildId !== input.reviewer.guild.id) throw new AppealError("APPEAL_GONE", M.review.gone);
    if (!input.decisionReason.trim()) {
      throw new AppealError("APPEAL_DECISION_REASON", M.review.decisionReasonRequired);
    }
    await this.assertCanReview(appeal, input.reviewer);
    if (!(DECIDABLE_APPEAL_STATUSES as AppealStatus[]).includes(appeal.status)) {
      throw new ConflictError(M.review.alreadyDecided);
    }
    const punishment = await punishmentService.getPunishment(appeal.punishmentId);
    if (!punishment) throw new AppealError("APPEAL_PUNISHMENT_GONE", M.review.punishmentGone);
    return { appeal, punishment };
  }

  private async assertCanReview(appeal: Appeal, reviewer: GuildMember): Promise<void> {
    if (!(await appealPermissionService.canReview(reviewer))) {
      throw new AppealError("APPEAL_FORBIDDEN", M.review.notAuthorized);
    }
    const punishment = await punishmentService.getPunishment(appeal.punishmentId);
    let investigatorId: string | null = null;
    if (punishment?.reportId) {
      const kase = await modmailCaseService.getByCaseId(punishment.reportId).catch(() => null);
      investigatorId = kase?.claimedByDiscordId ?? null;
    }
    if (
      isReviewerConflicted({
        reviewerId: reviewer.id,
        issuerId: punishment?.issuedBy,
        approverId: punishment?.approvedBy,
        investigatorId,
      })
    ) {
      throw new AppealError("APPEAL_SELF_REVIEW", M.review.selfReview);
    }
  }

  private async applyWarningPenalty(
    appeal: AppealDocument,
    punishment: PunishmentDocument,
  ): Promise<void> {
    if (appeal.penaltyAppliedAt) return;
    const issuerStaff = await staffService.ensure(punishment.issuedBy, punishment.guildId);
    const award = await staffPointService.add({
      staffId: issuerStaff._id,
      amount: APPEAL_SUCCESS_PENALTY,
      type: StaffPointTransactionType.APPEAL_SUCCESS_PENALTY,
      referenceId: appeal.appealId,
      reason: `Warning appeal ${appeal.appealId} accepted`,
    });

    if (award.transaction) {
      await AppealModel.updateOne(
        { _id: appeal._id, penaltyAppliedAt: { $exists: false } },
        {
          $set: {
            penaltyAppliedAt: new Date(),
            penaltyTransactionId: award.transaction._id,
          },
        },
      ).exec();
      await staffHistoryService.record({
        staffId: issuerStaff._id,
        action: StaffHistoryAction.APPEAL_PENALTY,
        performedBy: appeal.reviewedBy ?? "SYSTEM",
        reason: `Warning appeal ${appeal.appealId} accepted`,
        metadata: { appealId: appeal.appealId, punishmentId: punishment.punishmentId, amount: APPEAL_SUCCESS_PENALTY },
      });
    } else if (award.duplicate) {
      log.info(`appeal ${appeal.appealId} penalty already applied — skipped`);
    }
  }

  private async refreshCard(appealId: string): Promise<void> {
    try {
      const appeal = await this.getAppeal(appealId);
      if (!appeal?.channelId || !appeal.messageId) return;
      const punishment = await punishmentService.getPunishment(appeal.punishmentId);
      if (!punishment) return;
      const channel = await requireAppealClient()
        .channels.fetch(appeal.channelId)
        .catch(() => null);
      if (!channel || !("messages" in channel)) return;
      const message = await channel.messages.fetch(appeal.messageId).catch(() => null);
      if (!message) return;
      await message.edit(buildAppealReviewCard(appeal, punishment));
    } catch (err) {
      log.warn(`appeal card refresh failed for ${appealId}`, err);
    }
  }

  private async dmAppellant(
    userId: UserId,
    punishment: PunishmentDocument,
    decisionReason: string,
    outcome: "accepted" | "rejected",
  ): Promise<void> {
    try {
      const user = await requireAppealClient().users.fetch(userId);
      const dm = await user.createDM();
      const label = punishmentMessages.labels[punishment.type] ?? punishment.type;
      const body =
        outcome === "accepted"
          ? M.dm.accepted(label, decisionReason)
          : M.dm.rejected(label, decisionReason);
      await dm.send({ content: body, allowedMentions: { parse: [] } });
    } catch (err) {
      log.warn(`appeal decision DM to ${userId} failed`, err);
    }
  }
}

export const appealService = new AppealService();
