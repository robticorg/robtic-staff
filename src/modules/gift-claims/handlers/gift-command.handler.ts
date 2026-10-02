import {
  ContainerBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { buildAmountModal, buildLinkModal, buildProofModal } from "../render/delivery-components.ts";
import { buildGiftRequestModal } from "../render/request-modal.ts";
import { GiftCommandMode, giftCommandService } from "../services/delivery/gift-command.service.ts";
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

    if (draft.mode === GiftCommandMode.REQUEST) {
      await interaction.showModal(
        buildGiftRequestModal(GiftClaimCustomId.cmdRequestModal(draftId, type), type, {
          amount: extractCreditAmount(draft.info),
          item: type === GiftDeliveryType.CREDITS ? null : draft.info,
        }),
      );
      return;
    }

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

export async function handleCommandRequestModal(
  interaction: ModalSubmitInteraction,
  draftId: string,
  rawType: string | undefined,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply(EPHEMERAL);
  try {
    const type = deliveryTypeFrom(rawType);
    if (!type) {
      await interaction.editReply(M.errors.typeRequired);
      return;
    }
    const { orderChannelId, draft } = await giftCommandService.submitRequest(draftId, interaction.member, {
      type,
      amount: modalText(interaction, GiftClaimModalField.amount) || null,
      item: modalText(interaction, GiftClaimModalField.item) || null,
      account: modalText(interaction, GiftClaimModalField.account) || null,
      proof: modalUploads(interaction, GiftClaimModalField.deliveryProof),
    });
    const done = M.command.requestDone(draft.userId, orderChannelId);
    await interaction.editReply(done);
    if (interaction.isFromMessage()) {
      const container = new ContainerBuilder().setAccentColor(colors.success);
      container.addTextDisplayComponents((t) => t.setContent(done));
      await interaction.message
        .edit({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } })
        .catch(() => undefined);
    }
  } catch (err) {
    await replyDeliveryError(interaction, err, "command request");
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
