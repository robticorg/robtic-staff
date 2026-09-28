import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { giftClaimComponents } from "../../../data/gift-claim/components.ts";
import { GIFT_DELIVERY_TYPE_LABELS } from "../../../data/gift-claim/delivery-messages.ts";
import { GIFT_DELIVERY_TYPE_VALUES } from "../types/enums.ts";
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
      new LabelBuilder().setLabel(C.deliveryTypeLabel).setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId(GiftClaimModalField.deliveryType)
          .setPlaceholder(C.deliveryTypePlaceholder)
          .setMinValues(1)
          .setMaxValues(1)
          .setRequired(true)
          .addOptions(
            GIFT_DELIVERY_TYPE_VALUES.map((type) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(GIFT_DELIVERY_TYPE_LABELS[type] ?? type)
                .setValue(type),
            ),
          ),
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
