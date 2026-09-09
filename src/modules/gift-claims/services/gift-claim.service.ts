import { type GuildMember } from "discord.js";
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
import { DECIDABLE_CLAIM_STATUSES, GiftClaimAuditAction, GiftClaimStatus } from "../types/enums.ts";
import { giftClaimAuditService } from "./gift-claim-audit.service.ts";
import { giftClaimPermissionService } from "./gift-claim-permissions.ts";
import { requireGiftClaimClient } from "../runtime.ts";

const log = logger.child("gift-claim");
const M = giftClaimMessages;

export class GiftClaimError extends DomainError {}

type ClaimDoc = HydratedDocument<GiftClaim>;

export interface CanCreateResult {
  ok: boolean;
  message?: string;
}

const OPEN_CLAIM_STATUSES: readonly GiftClaimStatus[] = [
  GiftClaimStatus.PENDING,
  GiftClaimStatus.APPROVED,
];

export interface CreateFromModalInput {
  guildId: GuildId;
  member: GuildMember;
  rewardName: string;
  prize?: string;
  proofUrl: string;
}

export interface ManagerActionInput {
  claimId: string;
  manager: GuildMember;
}

export interface RejectInput extends ManagerActionInput {
  reason: string;
}

export interface FulfillInput extends ManagerActionInput {
  proofUrl: string;
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

  async canCreate(guildId: GuildId, userId: UserId): Promise<CanCreateResult> {
    const open = await GiftClaimModel.findOne({
      guildId,
      userId,
      status: { $in: OPEN_CLAIM_STATUSES as GiftClaimStatus[] },
    }).exec();
    if (open) return { ok: false, message: M.create.alreadyClaimed(open.status) };
    return { ok: true };
  }

  async createFromModal(input: CreateFromModalInput): Promise<{ claim: ClaimDoc }> {
    const gate = await this.canCreate(input.guildId, input.member.id);
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

  async approveClaim(input: ManagerActionInput): Promise<{ claim: ClaimDoc }> {
    const claim = await this.forManager(input);

    const updated = await GiftClaimModel.findOneAndUpdate(
      { claimId: claim.claimId, status: { $in: DECIDABLE_CLAIM_STATUSES as GiftClaimStatus[] } },
      {
        $set: {
          status: GiftClaimStatus.APPROVED,
          reviewedBy: input.manager.id,
          reviewedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!updated) throw new ConflictError(M.review.alreadyDecided);

    await this.after(updated, input.manager.id, {
      audit: GiftClaimAuditAction.APPROVED,
      activity: StaffActivityType.GIFT_CLAIM_APPROVE,
      dm: M.dm.approved,
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

    await this.after(updated, input.manager.id, {
      audit: GiftClaimAuditAction.REJECTED,
      activity: StaffActivityType.GIFT_CLAIM_REJECT,
      dm: M.dm.rejected(reason),
    });
    return { claim: updated };
  }

  async fulfillClaim(input: FulfillInput): Promise<{ claim: ClaimDoc }> {
    const claim = await this.forManager(input);
    const proofUrl = input.proofUrl.trim();
    if (!proofUrl) throw new GiftClaimError("GIFT_FULFILL_PROOF", M.review.fulfillProofRequired);

    const updated = await GiftClaimModel.findOneAndUpdate(
      { claimId: claim.claimId, status: GiftClaimStatus.APPROVED },
      {
        $set: {
          status: GiftClaimStatus.FULFILLED,
          fulfilledBy: input.manager.id,
          fulfilledAt: new Date(),
          fulfillmentProof: proofUrl,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!updated) {
      const fresh = await this.getClaim(claim.claimId);
      throw new ConflictError(
        fresh && fresh.status !== GiftClaimStatus.FULFILLED
          ? M.review.notApproved
          : M.review.alreadyDecided,
      );
    }

    await this.after(updated, input.manager.id, {
      audit: GiftClaimAuditAction.FULFILLED,
      activity: StaffActivityType.GIFT_CLAIM_FULFILL,
      dm: M.dm.fulfilled,
      dmFiles: [proofUrl],
      handledCounter: true,
    });
    return { claim: updated };
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
      dm: string;
      dmFiles?: string[];
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
    await this.refreshCase(claim.claimId);
    await this.dm(claim.userId, opts.dm, opts.dmFiles);
  }

  private async refreshCase(claimId: string): Promise<void> {
    try {
      const claim = await this.getClaim(claimId);
      if (!claim?.channelId || !claim.messageId) return;
      const channel = await requireGiftClaimClient()
        .channels.fetch(claim.channelId)
        .catch(() => null);
      if (!channel || !("messages" in channel)) return;
      const message = await channel.messages.fetch(claim.messageId).catch(() => null);
      if (!message) return;
      await message.edit(buildGiftClaimCaseCard(claim));
    } catch (err) {
      log.warn(`gift claim card refresh failed for ${claimId}`, err);
    }
  }

  private async dm(userId: UserId, content: string, files?: string[]): Promise<void> {
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
