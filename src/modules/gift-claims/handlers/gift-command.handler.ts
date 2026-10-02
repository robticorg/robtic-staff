import {
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { buildAmountModal, buildLinkModal, buildProofModal } from "../render/delivery-components.ts";
import { giftCommandService } from "../services/delivery/gift-command.service.ts";
import { giftDeliveryProofService } from "../services/delivery/gift-delivery-proof.service.ts";
import { extractCreditAmount, parseGiftLink } from "../services/delivery/gift-delivery-input.ts";
import { giftDeliveryService } from "../services/delivery/gift-delivery.service.ts";
import { GiftDeliveryType } from "../types/enums.ts";
import { GiftClaimCustomId, GiftClaimModalField } from "./component-ids.ts";
import { creditAck, deliveryTypeFrom, linkAck, replyDeliveryError } from "./delivery.handler.ts";
import { modalText, modalUploads } from "./delivery-input.ts";

const M = giftDeliveryMessages;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleCommandType(
  interaction: StringSelectMenuInteraction,
  draftId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  try {
    const type = deliveryTypeFrom(interaction.values[0]);
    if (!type) {
      await interaction.reply({ content: M.errors.typeRequired, ...EPHEMERAL });
      return;
    }
    const draft = await giftCommandService.resume(draftId, interaction.member);

    if (type === GiftDeliveryType.LINK) {
      await interaction.showModal(buildLinkModal(GiftClaimCustomId.cmdLinkModal(draftId)));
    } else if (type === GiftDeliveryType.OTHER) {
      await interaction.showModal(buildProofModal(GiftClaimCustomId.cmdProofModal(draftId)));
    } else {
      await interaction.showModal(
        buildAmountModal(GiftClaimCustomId.cmdAmountModal(draftId), extractCreditAmount(draft.info)),
      );
    }
  } catch (err) {
    await replyDeliveryError(interaction, err, "command type");
  }
}

export async function handleCommandAmountModal(
  interaction: ModalSubmitInteraction,
  draftId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply(EPHEMERAL);
  try {
    const amount = giftDeliveryService.requireAmount(modalText(interaction, GiftClaimModalField.amount));

    const draft = await giftCommandService.take(draftId, interaction.member);
    const claim = await giftDeliveryService.createCommandClaim({
      staff: interaction.member,
      userId: draft.userId,
      ticketId: draft.ticketId,
      originChannelId: draft.channelId,
      rewardName: M.command.rewardName(draft.info),
      type: GiftDeliveryType.CREDITS,
      amount,
    });
    const result = await giftDeliveryService.deliverCredits(claim.claimId, interaction.member);
    await interaction.editReply(creditAck(result, claim.amount ?? amount));
  } catch (err) {
    await replyDeliveryError(interaction, err, "command credits");
  }
}

export async function handleCommandLinkModal(
  interaction: ModalSubmitInteraction,
  draftId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply(EPHEMERAL);
  try {
    const link = modalText(interaction, GiftClaimModalField.link);
    if (!parseGiftLink(link)) {
      await interaction.editReply(M.errors.linkInvalid);
      return;
    }
    const proof = modalUploads(interaction, GiftClaimModalField.deliveryProof);
    giftDeliveryProofService.assertValid(proof);

    const draft = await giftCommandService.take(draftId, interaction.member);
    const claim = await giftDeliveryService.createCommandClaim({
      staff: interaction.member,
      userId: draft.userId,
      ticketId: draft.ticketId,
      originChannelId: draft.channelId,
      rewardName: M.command.rewardName(draft.info),
      type: GiftDeliveryType.LINK,
    });
    const result = await giftDeliveryService.deliverLink({
      claimId: claim.claimId,
      actor: interaction.member,
      link,
      info: modalText(interaction, GiftClaimModalField.info) || null,
      proof,
    });
    await interaction.editReply(linkAck(result));
  } catch (err) {
    await replyDeliveryError(interaction, err, "command link");
  }
}

export async function handleCommandProofModal(
  interaction: ModalSubmitInteraction,
  draftId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply(EPHEMERAL);
  try {
    const uploads = modalUploads(interaction, GiftClaimModalField.deliveryProof);
    giftDeliveryProofService.assertValid(uploads);

    const draft = await giftCommandService.take(draftId, interaction.member);
    const claim = await giftDeliveryService.createCommandClaim({
      staff: interaction.member,
      userId: draft.userId,
      ticketId: draft.ticketId,
      originChannelId: draft.channelId,
      rewardName: M.command.rewardName(draft.info),
      type: GiftDeliveryType.OTHER,
    });
    await giftDeliveryService.deliverOther({
      claimId: claim.claimId,
      actor: interaction.member,
      uploads,
      info: modalText(interaction, GiftClaimModalField.info) || null,
    });
    await interaction.editReply(M.acks.otherDelivered);
  } catch (err) {
    await replyDeliveryError(interaction, err, "command proof");
  }
}
