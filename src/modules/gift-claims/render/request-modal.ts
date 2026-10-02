import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { giftClaimConfig } from "../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { GiftClaimModalField } from "../handlers/component-ids.ts";
import { GiftDeliveryType } from "../types/enums.ts";

const R = giftDeliveryMessages.requestModals;
const LIMITS = giftClaimConfig.delivery;

function text(input: {
  id: string;
  label: string;
  placeholder: string;
  maxLength: number;
  required: boolean;
  value?: string | null;
}): LabelBuilder {
  const field = new TextInputBuilder()
    .setCustomId(input.id)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(input.placeholder)
    .setMaxLength(input.maxLength)
    .setRequired(input.required);
  if (input.value) field.setValue(input.value.slice(0, input.maxLength));
  return new LabelBuilder().setLabel(input.label).setTextInputComponent(field);
}

function proof(): LabelBuilder {
  return new LabelBuilder()
    .setLabel(R.proofLabel)
    .setDescription(R.proofDescription)
    .setFileUploadComponent(
      new FileUploadBuilder()
        .setCustomId(GiftClaimModalField.deliveryProof)
        .setMinValues(1)
        .setMaxValues(LIMITS.maxProofFiles)
        .setRequired(true),
    );
}

export function buildGiftRequestModal(
  customId: string,
  type: GiftDeliveryType,
  prefill: { amount?: string | null; item?: string | null } = {},
): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(customId);

  if (type === GiftDeliveryType.CREDITS) {
    return modal.setTitle(R.creditsTitle).addLabelComponents(
      text({
        id: GiftClaimModalField.amount,
        label: R.amountLabel,
        placeholder: R.amountPlaceholder,
        maxLength: 30,
        required: true,
        value: prefill.amount,
      }),
      proof(),
    );
  }

  if (type === GiftDeliveryType.LINK) {
    return modal.setTitle(R.linkTitle).addLabelComponents(
      text({
        id: GiftClaimModalField.item,
        label: R.linkItemLabel,
        placeholder: R.linkItemPlaceholder,
        maxLength: LIMITS.maxItemLength,
        required: true,
        value: prefill.item,
      }),
      proof(),
    );
  }

  return modal.setTitle(R.otherTitle).addLabelComponents(
    text({
      id: GiftClaimModalField.item,
      label: R.otherItemLabel,
      placeholder: R.otherItemPlaceholder,
      maxLength: LIMITS.maxItemLength,
      required: true,
      value: prefill.item,
    }),
    text({
      id: GiftClaimModalField.account,
      label: R.accountLabel,
      placeholder: R.accountPlaceholder,
      maxLength: LIMITS.maxAccountLength,
      required: false,
    }),
    proof(),
  );
}
