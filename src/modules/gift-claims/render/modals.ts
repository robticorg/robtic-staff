import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { giftClaimComponents } from "../../../data/gift-claim/components.ts";
import { GiftClaimCustomId, GiftClaimModalField } from "../handlers/component-ids.ts";

const C = giftClaimComponents;

export function buildGiftClaimSubmitModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(GiftClaimCustomId.submitModal())
    .setTitle(C.submitModalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(C.rewardLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(GiftClaimModalField.reward)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(C.rewardPlaceholder)
          .setMinLength(2)
          .setMaxLength(200)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(C.detailsLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(GiftClaimModalField.details)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(C.detailsPlaceholder)
          .setMaxLength(500)
          .setRequired(false),
      ),
      new LabelBuilder()
        .setLabel(C.proofLabel)
        .setDescription(C.proofDescription)
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId(GiftClaimModalField.proof)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
    );
}

export function buildRejectModal(claimId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(GiftClaimCustomId.rejectModal(claimId))
    .setTitle(C.rejectModalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(C.rejectReasonLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(GiftClaimModalField.rejectReason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(C.rejectReasonPlaceholder)
          .setMaxLength(900)
          .setRequired(true),
      ),
    );
}

export function buildFulfillModal(claimId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(GiftClaimCustomId.fulfillModal(claimId))
    .setTitle(C.fulfillModalTitle)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(C.fulfillProofLabel)
        .setDescription(C.fulfillProofDescription)
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId(GiftClaimModalField.fulfillProof)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
    );
}
