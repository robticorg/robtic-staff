import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type RepliableInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { giftClaimMessages } from "../../../data/gift-claim/messages.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import {
  buildAmountModal,
  buildDeliveryTypeMenu,
  buildLinkModal,
  buildProofModal,
} from "../render/delivery-components.ts";
import { giftClaimPermissionService } from "../services/gift-claim-permissions.ts";
import { giftClaimService } from "../services/gift-claim.service.ts";
import type { CreditDeliveryResult } from "../services/delivery/credit-delivery.service.ts";
import { parseCreditAmount } from "../services/delivery/gift-delivery-input.ts";
import { giftDeliveryService } from "../services/delivery/gift-delivery.service.ts";
import type { LinkDeliveryResult } from "../services/delivery/link-delivery.service.ts";
import {
  DECIDABLE_CLAIM_STATUSES,
  GIFT_DELIVERY_TYPE_VALUES,
  GiftClaimStatus,
  GiftDeliveryType,
  LinkDeliveryPath,
} from "../types/enums.ts";
import { GiftClaimCustomId, GiftClaimModalField } from "./component-ids.ts";
import { modalText, modalUploads } from "./delivery-input.ts";

const log = logger.child("gift-claim:delivery-handler");
const M = giftDeliveryMessages;
const R = giftClaimMessages.review;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export function deliveryTypeFrom(raw: string | undefined): GiftDeliveryType | null {
  return raw && (GIFT_DELIVERY_TYPE_VALUES as readonly string[]).includes(raw)
    ? (raw as GiftDeliveryType)
    : null;
}

export function creditAck(result: CreditDeliveryResult, amount: string): string {
  return result.ok ? M.acks.creditsDelivered(amount) : M.acks.creditsFailed(result.label);
}

export function linkAck(result: LinkDeliveryResult): string {
  return result.location.deliveryPath === LinkDeliveryPath.DM
    ? M.acks.linkReadyDm
    : M.acks.linkReadyChannel(result.location.deliveryChannelId);
}

export async function replyDeliveryError(
  interaction: RepliableInteraction,
  err: unknown,
  where: string,
): Promise<void> {
  const content = err instanceof DomainError ? err.message : R.claimGone;
  if (!(err instanceof DomainError)) log.error(`gift delivery ${where} failed`, err);
  try {
    if (interaction.deferred || interaction.replied) await interaction.editReply(content);
    else await interaction.reply({ content, ...EPHEMERAL });
  } catch {
    log.warn(`gift delivery ${where} reply failed`);
  }
}

async function requireManager(interaction: ButtonInteraction<"cached">): Promise<boolean> {
  if (await giftClaimPermissionService.isGiftManager(interaction.member)) return true;
  await interaction.reply({ content: R.notAuthorized, ...EPHEMERAL });
  return false;
}

export async function handleApprove(interaction: ButtonInteraction, claimId: string): Promise<void> {
  if (!interaction.inCachedGuild() || !(await requireManager(interaction))) return;
  const claim = await giftClaimService.getClaim(claimId);
  if (!claim || !(DECIDABLE_CLAIM_STATUSES as GiftClaimStatus[]).includes(claim.status)) {
    await interaction.reply({ content: R.alreadyDecided, ...EPHEMERAL });
    return;
  }
  if (claim.deliveryType) {
    await handleTypeChoice(interaction, claimId, claim.deliveryType);
    return;
  }
  await interaction.reply(
    buildDeliveryTypeMenu(M.typeMenu.claimHint, (type) => GiftClaimCustomId.type(claimId, type)),
  );
}

export async function handleTypeChoice(
  interaction: ButtonInteraction,
  claimId: string,
  rawType: string | undefined,
): Promise<void> {
  if (!interaction.inCachedGuild() || !(await requireManager(interaction))) return;
  const type = deliveryTypeFrom(rawType);
  if (!type) {
    await interaction.reply({ content: M.errors.typeRequired, ...EPHEMERAL });
    return;
  }

  if (type === GiftDeliveryType.CREDITS) {
    const claim = await giftClaimService.getClaim(claimId);
    await interaction.showModal(
      buildAmountModal(GiftClaimCustomId.amountModal(claimId), parseCreditAmount(claim?.prize)),
    );
    return;
  }

  await interaction.deferReply(EPHEMERAL);
  try {
    await giftDeliveryService.approveWithType({ claimId, manager: interaction.member, type });
    await interaction.editReply(M.acks.approvedPickDelivery);
  } catch (err) {
    await replyDeliveryError(interaction, err, "approve");
  }
}

export async function handleAmountModal(
  interaction: ModalSubmitInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply(EPHEMERAL);
  try {
    const current = await giftClaimService.getClaim(claimId);
    if (current?.status === GiftClaimStatus.APPROVED) {
      const result = await giftDeliveryService.deliverCredits(claimId, interaction.member);
      await interaction.editReply(creditAck(result, current.amount ?? ""));
      return;
    }
    const outcome = await giftDeliveryService.approveWithType({
      claimId,
      manager: interaction.member,
      type: GiftDeliveryType.CREDITS,
      amount: modalText(interaction, GiftClaimModalField.amount),
    });
    const claim = await giftClaimService.getClaim(claimId);
    await interaction.editReply(
      outcome.kind === "CREDITS" ? creditAck(outcome.result, claim?.amount ?? "") : M.acks.approvedPickDelivery,
    );
  } catch (err) {
    await replyDeliveryError(interaction, err, "credits");
  }
}

export async function handleDeliverButton(
  interaction: ButtonInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  try {
    const claim = await giftClaimService.getClaimOrThrow(claimId);
    await giftDeliveryService.assertCanDeliver(interaction.member, claim);
    if (claim.status !== GiftClaimStatus.APPROVED) {
      await interaction.reply({ content: M.errors.notApproved, ...EPHEMERAL });
      return;
    }
    if (claim.deliveryType === GiftDeliveryType.CREDITS) {
      await handleRetry(interaction, claimId);
      return;
    }
    await interaction.showModal(
      claim.deliveryType === GiftDeliveryType.LINK
        ? buildLinkModal(GiftClaimCustomId.linkModal(claimId))
        : buildProofModal(GiftClaimCustomId.proofModal(claimId)),
    );
  } catch (err) {
    await replyDeliveryError(interaction, err, "deliver");
  }
}

export async function handleLinkModal(
  interaction: ModalSubmitInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply(EPHEMERAL);
  try {
    const result = await giftDeliveryService.deliverLink({
      claimId,
      actor: interaction.member,
      link: modalText(interaction, GiftClaimModalField.link),
      info: modalText(interaction, GiftClaimModalField.info) || null,
      proof: modalUploads(interaction, GiftClaimModalField.deliveryProof),
    });
    await interaction.editReply(linkAck(result));
  } catch (err) {
    await replyDeliveryError(interaction, err, "link");
  }
}

export async function handleProofModal(
  interaction: ModalSubmitInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply(EPHEMERAL);
  try {
    await giftDeliveryService.deliverOther({
      claimId,
      actor: interaction.member,
      uploads: modalUploads(interaction, GiftClaimModalField.deliveryProof),
      info: modalText(interaction, GiftClaimModalField.info) || null,
    });
    await interaction.editReply(M.acks.otherDelivered);
  } catch (err) {
    await replyDeliveryError(interaction, err, "proof");
  }
}

export async function handleRetry(interaction: ButtonInteraction, claimId: string): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  // Only ask for the amount when it isn't known yet; otherwise retry the transfer directly.
  const claim = await giftClaimService.getClaim(claimId);
  if (!claim?.amount) {
    await interaction.showModal(buildAmountModal(GiftClaimCustomId.amountModal(claimId), claim?.prize));
    return;
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply(EPHEMERAL);
  try {
    const result = await giftDeliveryService.deliverCredits(claimId, interaction.member);
    await interaction.editReply(creditAck(result, claim.amount));
  } catch (err) {
    await replyDeliveryError(interaction, err, "retry");
  }
}

export async function handleReveal(interaction: ButtonInteraction, deliveryId: string): Promise<void> {
  await interaction.deferReply(EPHEMERAL);
  try {
    const { link, info } = await giftDeliveryService.reveal(deliveryId, interaction.user.id);
    await interaction.editReply({ content: M.user.revealed(link, info), allowedMentions: { parse: [] } });
  } catch (err) {
    await replyDeliveryError(interaction, err, "reveal");
  }
}
