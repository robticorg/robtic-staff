import type { GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { ConflictError } from "../../../../shared/utils/errors.ts";
import { giftClaimMessages } from "../../../../data/gift-claim/messages.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { staffPermissionService } from "../../../staff/services/staff-permissions.service.ts";
import type { GiftClaim } from "../../models/gift-claim.model.ts";
import type { GiftDeliveryDocument } from "../../models/gift-delivery.model.ts";
import {
  GiftClaimAuditAction,
  GiftClaimSource,
  GiftClaimStatus,
  GiftDeliveryType,
} from "../../types/enums.ts";
import { giftClaimAuditService } from "../gift-claim-audit.service.ts";
import { giftClaimPermissionService } from "../gift-claim-permissions.ts";
import { GiftClaimError, giftClaimService } from "../gift-claim.service.ts";
import {
  assertAutoclaimEnabled,
  creditDeliveryService,
  type CreditDeliveryResult,
} from "./credit-delivery.service.ts";
import { parseCreditAmount } from "./gift-delivery-input.ts";
import { giftDeliveriesChannel } from "./gift-deliveries-channel.ts";
import { giftDeliveryRepository } from "./gift-delivery.repository.ts";
import { linkDeliveryService, type LinkDeliveryResult } from "./link-delivery.service.ts";
import { manualGiftDeliveryService } from "./manual-gift-delivery.service.ts";
import { giftDeliveryProofService, type UploadedProof } from "./gift-delivery-proof.service.ts";

const M = giftDeliveryMessages;
type ClaimDoc = HydratedDocument<GiftClaim>;

export type ApproveOutcome =
  | { kind: "CREDITS"; result: CreditDeliveryResult }
  | { kind: "AWAITING_DELIVERY"; type: GiftDeliveryType };

export interface CommandClaimInput {
  staff: GuildMember;
  userId: string;
  ticketId: string;
  rewardName: string;
  type: GiftDeliveryType;
  amount?: string;
}

export class GiftDeliveryService {
  async assertCanDeliver(actor: GuildMember, claim: Pick<GiftClaim, "source" | "guildId">): Promise<void> {
    if (claim.guildId !== actor.guild.id) {
      throw new GiftClaimError("GIFT_CLAIM_GONE", giftClaimMessages.review.claimGone);
    }
    const allowed =
      claim.source === GiftClaimSource.COMMAND
        ? await staffPermissionService.canActAsStaff(actor)
        : await giftClaimPermissionService.isGiftManager(actor);
    if (!allowed) throw new GiftClaimError("GIFT_FORBIDDEN", giftClaimMessages.review.notAuthorized);
  }

  requireAmount(raw: string | null | undefined): string {
    const amount = parseCreditAmount(raw);
    if (!amount) throw new GiftClaimError("GIFT_AMOUNT_INVALID", M.errors.amountInvalid);
    return amount;
  }

  async approveWithType(input: {
    claimId: string;
    manager: GuildMember;
    type: GiftDeliveryType;
    amount?: string | null;
  }): Promise<ApproveOutcome> {
    const amount = input.type === GiftDeliveryType.CREDITS ? this.requireAmount(input.amount) : undefined;
    if (amount) {
      // Credits need no proof: autoclaim does the transfer and posts its own log.
      await assertAutoclaimEnabled(input.manager.guild.id);
      await giftDeliveriesChannel.resolve(input.manager.guild.id);
    }
    const { claim } = await giftClaimService.approveClaim({
      claimId: input.claimId,
      manager: input.manager,
      deliveryType: input.type,
      ...(amount ? { amount } : {}),
    });
    const delivery = await this.openDelivery(claim, input.type);

    if (input.type === GiftDeliveryType.CREDITS) {
      return {
        kind: "CREDITS",
        result: await this.runCredits(claim, delivery, input.manager.id),
      };
    }
    await giftClaimService.refreshCase(claim.claimId);
    return { kind: "AWAITING_DELIVERY", type: input.type };
  }

  async createCommandClaim(input: CommandClaimInput): Promise<ClaimDoc> {
    const amount = input.type === GiftDeliveryType.CREDITS ? this.requireAmount(input.amount) : undefined;
    if (amount) await assertAutoclaimEnabled(input.staff.guild.id);
    const { claim } = await giftClaimService.createFromCommand({
      guildId: input.staff.guild.id,
      staffId: input.staff.id,
      userId: input.userId,
      rewardName: input.rewardName,
      ticketId: input.ticketId,
      deliveryType: input.type,
      ...(amount ? { amount } : {}),
    });
    await this.openDelivery(claim, input.type);
    return claim;
  }

  /** Transfers the credits through autoclaim (first try or retry). No proof involved. */
  async deliverCredits(claimId: string, actor: GuildMember): Promise<CreditDeliveryResult> {
    const claim = await this.claimFor(claimId, actor, GiftDeliveryType.CREDITS);
    const delivery = await this.openDelivery(claim, GiftDeliveryType.CREDITS);
    return this.runCredits(claim, delivery, actor.id);
  }

  async deliverLink(input: {
    claimId: string;
    actor: GuildMember;
    link: string;
    info: string | null;
    proof: readonly UploadedProof[];
  }): Promise<LinkDeliveryResult> {
    const claim = await this.claimFor(input.claimId, input.actor, GiftDeliveryType.LINK);
    const delivery = await this.openDelivery(claim, GiftDeliveryType.LINK);
    try {
      giftDeliveryProofService.assertValid(input.proof);
      const proof = await giftDeliveryProofService.fetch(input.proof);
      const result = await linkDeliveryService.deliver(
        delivery,
        input.actor.id,
        input.link,
        input.info,
        proof,
      );
      await giftClaimAuditService.record({
        claimId: claim.claimId,
        guildId: claim.guildId,
        action: GiftClaimAuditAction.DELIVERY_READY,
        actorId: input.actor.id,
        userId: claim.userId,
        metadata: { path: result.location.deliveryPath },
      });
      return result;
    } finally {
      await giftClaimService.refreshCase(claim.claimId);
    }
  }

  async deliverOther(input: {
    claimId: string;
    actor: GuildMember;
    uploads: readonly UploadedProof[];
    info: string | null;
  }): Promise<GiftDeliveryDocument> {
    const claim = await this.claimFor(input.claimId, input.actor, GiftDeliveryType.OTHER);
    const delivery = await this.openDelivery(claim, GiftDeliveryType.OTHER);
    try {
      const { delivery: done, files } = await manualGiftDeliveryService.deliver(
        delivery,
        input.actor.id,
        input.uploads,
        input.info,
      );
      await giftClaimService.completeFromDelivery({
        claimId: claim.claimId,
        actorId: input.actor.id,
        dm: giftClaimMessages.dm.fulfilled,
        dmFiles: giftDeliveryProofService.attachments(files),
      });
      return done;
    } finally {
      await giftClaimService.refreshCase(claim.claimId);
    }
  }

  async reveal(deliveryId: string, userId: string): Promise<{ link: string; info: string | null }> {
    const revealed = await linkDeliveryService.reveal(deliveryId, userId);
    const delivery = revealed.delivery;
    await giftClaimService.completeFromDelivery({
      claimId: delivery.claimId,
      actorId: delivery.deliveredBy ?? userId,
      dm: null,
    });
    await giftClaimAuditService.record({
      claimId: delivery.claimId,
      guildId: delivery.guildId,
      action: GiftClaimAuditAction.DELIVERY_CLAIMED,
      actorId: userId,
      userId,
    });
    return { link: revealed.link, info: revealed.info };
  }

  private async runCredits(
    claim: ClaimDoc,
    delivery: GiftDeliveryDocument,
    staffId: string,
  ): Promise<CreditDeliveryResult> {
    const result = await creditDeliveryService.deliver(delivery, staffId);
    if (result.ok) {
      await giftClaimService.completeFromDelivery({
        claimId: claim.claimId,
        actorId: staffId,
        dm: M.user.creditsDelivered(delivery.amount ?? claim.amount ?? ""),
      });
    } else {
      await giftClaimAuditService.record({
        claimId: claim.claimId,
        guildId: claim.guildId,
        action: GiftClaimAuditAction.DELIVERY_FAILED,
        actorId: staffId,
        userId: claim.userId,
        metadata: { reason: result.reason },
      });
      await giftClaimService.refreshCase(claim.claimId);
    }
    return result;
  }

  private async claimFor(
    claimId: string,
    actor: GuildMember,
    type: GiftDeliveryType,
  ): Promise<ClaimDoc> {
    const claim = await giftClaimService.getClaimOrThrow(claimId);
    await this.assertCanDeliver(actor, claim);
    if (claim.status === GiftClaimStatus.FULFILLED) throw new ConflictError(M.errors.alreadyDelivered);
    if (claim.status !== GiftClaimStatus.APPROVED) {
      throw new GiftClaimError("GIFT_NOT_APPROVED", M.errors.notApproved);
    }
    const effective = claim.deliveryType ?? GiftDeliveryType.OTHER;
    if (effective !== type) throw new GiftClaimError("GIFT_TYPE_MISMATCH", M.errors.typeMismatch);
    return claim;
  }

  private async openDelivery(claim: ClaimDoc, type: GiftDeliveryType): Promise<GiftDeliveryDocument> {
    const delivery = await giftDeliveryRepository.openForClaim({
      guildId: claim.guildId,
      claimId: claim.claimId,
      userId: claim.userId,
      type,
      ...(claim.amount ? { amount: claim.amount } : {}),
    });
    if (delivery.type !== type) throw new GiftClaimError("GIFT_TYPE_MISMATCH", M.errors.typeMismatch);
    return delivery;
  }
}

export const giftDeliveryService = new GiftDeliveryService();
