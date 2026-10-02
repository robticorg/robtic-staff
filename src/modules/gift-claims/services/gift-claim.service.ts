import { type AttachmentBuilder, type GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { ConflictError, DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { giftClaimMessages } from "../../../data/gift-claim/messages.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { StaffActivityType, staffActivityService, staffService } from "../../staff/index.ts";
import { GiftClaimModel, type GiftClaim } from "../models/gift-claim.model.ts";
import { buildGiftClaimCaseCard } from "../render/case-card.ts";
import {
  DECIDABLE_CLAIM_STATUSES,
  GiftClaimAuditAction,
  GiftClaimSource,
  GiftClaimStatus,
  type GiftDeliveryType,
} from "../types/enums.ts";
import { GiftDeliveryModel } from "../models/gift-delivery.model.ts";
import { giftClaimAuditService } from "./gift-claim-audit.service.ts";
import { giftClaimPermissionService } from "./gift-claim-permissions.ts";
import { requireGiftClaimClient } from "../runtime.ts";
import { giftClaimPanel } from "../../../data/tickets/panels/gift-claim.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { isBlacklistedFor } from "../../tickets/services/ticket-blacklist.ts";

const log = logger.child("gift-claim");
const M = giftClaimMessages;

export class GiftClaimError extends DomainError {}

type ClaimDoc = HydratedDocument<GiftClaim>;

export interface CanCreateResult {
  ok: boolean;
  message?: string;
}

export interface CreateFromModalInput {
  guildId: GuildId;
  member: GuildMember;
  rewardName: string;
  prize?: string;
  proofUrl: string;
  deliveryType?: GiftDeliveryType;
}

export interface ManagerActionInput {
  claimId: string;
  manager: GuildMember;
}

export interface ApproveInput extends ManagerActionInput {
  deliveryType?: GiftDeliveryType;
  amount?: string;
}

export interface CreateFromCommandInput {
  guildId: GuildId;
  staffId: UserId;
  userId: UserId;
  rewardName: string;
  ticketId: string | null;
  originChannelId: string;
  deliveryType: GiftDeliveryType;
  amount?: string;
  untracked?: boolean;
  transferChannelId?: string;
}

export interface CreateRequestInput {
  guildId: GuildId;
  staffId: UserId;
  userId: UserId;
  ticketId: string | null;
  info: string | null;
  originChannelId: string;
  deliveryType?: GiftDeliveryType;
  amount?: string | null;
  account?: string | null;
  proofUrls?: readonly string[];
}

export interface CompleteDeliveryInput {
  claimId: string;
  actorId: UserId;
  dm: string | null;
  dmFiles?: (string | AttachmentBuilder)[];
}

export interface RejectInput extends ManagerActionInput {
  reason: string;
}

export class GiftClaimService extends BaseRepository<GiftClaim> {
  constructor() {
    super(GiftClaimModel);
  }

  getClaim(claimId: string): Promise<ClaimDoc | null> {
    return this.findOne({ claimId });
  }

  async getClaimOrThrow(claimId: string): Promise<ClaimDoc> {
    const claim = await this.getClaim(claimId);
    if (!claim) throw new GiftClaimError("GIFT_CLAIM_GONE", M.review.claimGone);
    return claim;
  }

  getUserClaims(guildId: GuildId, userId: UserId): Promise<ClaimDoc[]> {
    return GiftClaimModel.find({ guildId, userId }).sort({ createdAt: -1 }).exec();
  }

  async canCreate(member: GuildMember): Promise<CanCreateResult> {
    const { intakeService, IntakeClosedError } = await import(
      "../../intake/services/intake.service.ts"
    );
    try {
      await intakeService.assertPanelOpen(member.guild.id, giftClaimPanel.id);
    } catch (err) {
      if (err instanceof IntakeClosedError) return { ok: false, message: err.message };
      throw err;
    }
    if (await isBlacklistedFor(member, giftClaimPanel)) {
      return { ok: false, message: ticketMessages.blacklist.blocked };
    }
    return { ok: true };
  }

  async createFromModal(input: CreateFromModalInput): Promise<{ claim: ClaimDoc }> {
    const gate = await this.canCreate(input.member);
    if (!gate.ok) {
      throw new GiftClaimError("GIFT_CLAIM_OPEN", gate.message ?? M.create.alreadyClaimed(""));
    }

    const channelId = await channelConfigService.getChannelId(
      input.guildId,
      ChannelConfigType.GIFT_CLAIMS,
    );
    if (!channelId) {
      throw new GiftClaimError("GIFT_CHANNEL_MISSING", M.create.channelNotConfigured);
    }

    const rewardName = input.rewardName.trim() || M.case.rewardFallback;
    const prize = input.prize?.trim() || undefined;

    const claim = await GiftClaimModel.create({
      guildId: input.guildId,
      userId: input.member.id,
      rewardName,
      prize,
      status: GiftClaimStatus.PENDING,
      proof: [{ url: input.proofUrl, uploadedAt: new Date() }],
      channelId,
      ...(input.deliveryType ? { deliveryType: input.deliveryType } : {}),
    });

    try {
      const channel = await requireGiftClaimClient().channels.fetch(channelId);
      if (channel && "send" in channel) {
        const card = await channel.send(buildGiftClaimCaseCard(claim));
        claim.messageId = card.id;
        await claim.save();
      }
    } catch (err) {
      log.warn(`gift claim ${claim.claimId} case card send failed`, err);
    }

    await giftClaimAuditService.record({
      claimId: claim.claimId,
      guildId: input.guildId,
      action: GiftClaimAuditAction.CREATED,
      actorId: input.member.id,
      userId: input.member.id,
    });
    await this.dm(input.member.id, M.dm.submitted(rewardName));

    return { claim };
  }

  async approveClaim(input: ApproveInput): Promise<{ claim: ClaimDoc }> {
    const claim = await this.forManager(input);

    const updated = await GiftClaimModel.findOneAndUpdate(
      { claimId: claim.claimId, status: { $in: DECIDABLE_CLAIM_STATUSES as GiftClaimStatus[] } },
      {
        $set: {
          status: GiftClaimStatus.APPROVED,
          reviewedBy: input.manager.id,
          reviewedAt: new Date(),
          ...(input.deliveryType ? { deliveryType: input.deliveryType } : {}),
          ...(input.amount ? { amount: input.amount } : {}),
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!updated) throw new ConflictError(M.review.alreadyDecided);

    await this.after(updated, input.manager.id, {
      audit: GiftClaimAuditAction.APPROVED,
      activity: StaffActivityType.GIFT_CLAIM_APPROVE,
      dm: updated.source === GiftClaimSource.REQUEST ? null : M.dm.approved,
    });
    return { claim: updated };
  }

  async rejectClaim(input: RejectInput): Promise<{ claim: ClaimDoc }> {
    const claim = await this.forManager(input);
    const reason = input.reason.trim();
    if (!reason) throw new GiftClaimError("GIFT_REJECT_REASON", M.review.rejectReasonRequired);

    const updated = await GiftClaimModel.findOneAndUpdate(
      { claimId: claim.claimId, status: { $in: DECIDABLE_CLAIM_STATUSES as GiftClaimStatus[] } },
      {
        $set: {
          status: GiftClaimStatus.REJECTED,
          rejectionReason: reason.slice(0, 1000),
          reviewedBy: input.manager.id,
          reviewedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!updated) throw new ConflictError(M.review.alreadyDecided);

    const isRequest = updated.source === GiftClaimSource.REQUEST;
    await this.after(updated, input.manager.id, {
      audit: GiftClaimAuditAction.REJECTED,
      activity: StaffActivityType.GIFT_CLAIM_REJECT,
      dm: isRequest ? null : M.dm.rejected(reason),
    });
    if (isRequest) {
      await this.notifyOrigin(
        updated.originChannelId,
        M.request.rejected(updated.userId, updated.requestedBy ?? null, input.manager.id, reason),
      );
    }
    return { claim: updated };
  }

  async createFromCommand(input: CreateFromCommandInput): Promise<{ claim: ClaimDoc }> {
    const claim = await GiftClaimModel.create({
      guildId: input.guildId,
      userId: input.userId,
      rewardName: input.rewardName.slice(0, 200) || M.case.rewardFallback,
      status: GiftClaimStatus.APPROVED,
      source: GiftClaimSource.COMMAND,
      ...(input.ticketId ? { ticketId: input.ticketId } : {}),
      originChannelId: input.originChannelId,
      deliveryType: input.deliveryType,
      ...(input.amount ? { amount: input.amount } : {}),
      proof: [],
      reviewedBy: input.staffId,
      reviewedAt: new Date(),
      ...(input.untracked || input.transferChannelId
        ? {
            metadata: {
              ...(input.untracked ? { untracked: true } : {}),
              ...(input.transferChannelId ? { transferChannelId: input.transferChannelId } : {}),
            },
          }
        : {}),
    });

    await giftClaimAuditService.record({
      claimId: claim.claimId,
      guildId: input.guildId,
      action: GiftClaimAuditAction.CREATED,
      actorId: input.staffId,
      userId: input.userId,
      metadata: { source: GiftClaimSource.COMMAND, ticketId: input.ticketId, channelId: input.originChannelId },
    });
    await this.after(claim, input.staffId, {
      audit: GiftClaimAuditAction.APPROVED,
      activity: StaffActivityType.GIFT_CLAIM_APPROVE,
      dm: null,
    });
    return { claim };
  }

  async createRequest(input: CreateRequestInput): Promise<{ claim: ClaimDoc; channelId: string }> {
    const channelId = await channelConfigService.getChannelId(input.guildId, ChannelConfigType.GIFT_CLAIMS);
    if (!channelId) throw new GiftClaimError("GIFT_CHANNEL_MISSING", M.create.channelNotConfigured);
    const channel = await requireGiftClaimClient().channels.fetch(channelId).catch(() => null);
    if (!channel || !("send" in channel)) {
      throw new GiftClaimError("GIFT_CHANNEL_MISSING", M.create.channelNotConfigured);
    }

    const info = input.info?.trim().slice(0, 300) || null;
    const rewardName = info ?? (input.amount ? M.request.creditsReward(input.amount) : M.request.rewardFallback);
    const now = new Date();
    const claim = await GiftClaimModel.create({
      guildId: input.guildId,
      userId: input.userId,
      rewardName: rewardName.slice(0, 200),
      ...(info ? { prize: info } : {}),
      ...(input.amount ? { amount: input.amount } : {}),
      ...(input.account ? { account: input.account } : {}),
      status: GiftClaimStatus.PENDING,
      source: GiftClaimSource.REQUEST,
      ...(input.ticketId ? { ticketId: input.ticketId } : {}),
      requestedBy: input.staffId,
      originChannelId: input.originChannelId,
      ...(input.deliveryType ? { deliveryType: input.deliveryType } : {}),
      proof: (input.proofUrls ?? []).map((url) => ({ url, uploadedAt: now })),
      channelId,
    });

    try {
      const card = await channel.send(buildGiftClaimCaseCard(claim));
      claim.messageId = card.id;
      await claim.save();
    } catch (err) {
      log.warn(`gift request ${claim.claimId} card send failed`, err);
    }

    await giftClaimAuditService.record({
      claimId: claim.claimId,
      guildId: input.guildId,
      action: GiftClaimAuditAction.CREATED,
      actorId: input.staffId,
      userId: input.userId,
      metadata: { source: GiftClaimSource.REQUEST, channelId: input.originChannelId },
    });
    return { claim, channelId };
  }

  private async notifyOrigin(channelId: string | undefined, content: string): Promise<void> {
    if (!channelId) return;
    try {
      const channel = await requireGiftClaimClient().channels.fetch(channelId).catch(() => null);
      if (channel && "send" in channel) await channel.send({ content, allowedMentions: { parse: [] } });
    } catch (err) {
      log.warn(`gift request notice in ${channelId} failed`, err);
    }
  }

  async completeFromDelivery(input: CompleteDeliveryInput): Promise<ClaimDoc | null> {
    const updated = await GiftClaimModel.findOneAndUpdate(
      { claimId: input.claimId, status: GiftClaimStatus.APPROVED },
      {
        $set: {
          status: GiftClaimStatus.FULFILLED,
          fulfilledBy: input.actorId,
          fulfilledAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!updated) return null;

    await this.after(updated, input.actorId, {
      audit: GiftClaimAuditAction.FULFILLED,
      activity: StaffActivityType.GIFT_CLAIM_FULFILL,
      dm: input.dm,
      dmFiles: input.dmFiles,
      handledCounter: true,
    });
    return updated;
  }

  private async forManager(input: ManagerActionInput): Promise<ClaimDoc> {
    const claim = await this.getClaimOrThrow(input.claimId);
    if (claim.guildId !== input.manager.guild.id) {
      throw new GiftClaimError("GIFT_CLAIM_GONE", M.review.claimGone);
    }
    if (!(await giftClaimPermissionService.isGiftManager(input.manager))) {
      throw new GiftClaimError("GIFT_FORBIDDEN", M.review.notAuthorized);
    }
    return claim;
  }

  private async after(
    claim: ClaimDoc,
    actorId: UserId,
    opts: {
      audit: GiftClaimAuditAction;
      activity: StaffActivityType;
      dm: string | null;
      dmFiles?: (string | AttachmentBuilder)[];
      handledCounter?: boolean;
    },
  ): Promise<void> {
    await giftClaimAuditService.record({
      claimId: claim.claimId,
      guildId: claim.guildId,
      action: opts.audit,
      actorId,
      userId: claim.userId,
    });
    if (!claim.metadata?.untracked) await this.trackStaff(claim, actorId, opts);
    await this.refreshCase(claim.claimId);
    if (opts.dm) await this.dm(claim.userId, opts.dm, opts.dmFiles);
  }

  private async trackStaff(
    claim: ClaimDoc,
    actorId: UserId,
    opts: { activity: StaffActivityType; handledCounter?: boolean },
  ): Promise<void> {
    try {
      const staff = await staffService.ensure(actorId, claim.guildId);
      await staffActivityService.create({
        staffId: staff._id,
        type: opts.activity,
        referenceId: claim.claimId,
        metadata: { userId: claim.userId },
      });
      if (opts.handledCounter) {
        await staffService.incrementCounters(staff._id, { giftClaimsHandled: 1 });
      }
    } catch (err) {
      log.warn(`gift claim ${claim.claimId} staff bookkeeping failed`, err);
    }
  }

  async refreshCase(claimId: string): Promise<void> {
    try {
      const claim = await this.getClaim(claimId);
      if (!claim?.channelId || !claim.messageId) return;
      const channel = await requireGiftClaimClient()
        .channels.fetch(claim.channelId)
        .catch(() => null);
      if (!channel || !("messages" in channel)) return;
      const message = await channel.messages.fetch(claim.messageId).catch(() => null);
      if (!message) return;
      const delivery = await GiftDeliveryModel.findOne({ claimId }).exec();
      await message.edit(buildGiftClaimCaseCard(claim, delivery));
    } catch (err) {
      log.warn(`gift claim card refresh failed for ${claimId}`, err);
    }
  }

  private async dm(
    userId: UserId,
    content: string,
    files?: (string | AttachmentBuilder)[],
  ): Promise<void> {
    try {
      const user = await requireGiftClaimClient().users.fetch(userId);
      const dm = await user.createDM();
      await dm.send({ content, files, allowedMentions: { parse: [] } });
    } catch (err) {
      log.warn(`gift claim DM to ${userId} failed`, err);
    }
  }
}

export const giftClaimService = new GiftClaimService();
