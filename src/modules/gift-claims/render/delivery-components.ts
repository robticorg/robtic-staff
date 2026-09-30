import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SectionBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type BaseMessageOptions,
  type InteractionReplyOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { giftClaimConfig } from "../../../data/gift-claim/config.ts";
import {
  GIFT_DELIVERY_TYPE_LABELS,
  giftDeliveryMessages,
} from "../../../data/gift-claim/delivery-messages.ts";
import { GiftClaimModalField } from "../handlers/component-ids.ts";
import { GIFT_DELIVERY_TYPE_VALUES, type GiftDeliveryType } from "../types/enums.ts";

const M = giftDeliveryMessages;

function typeMenuContainer(
  hint: string,
  customIdFor: (type: GiftDeliveryType) => string,
): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(M.typeMenu.title));
  container.addTextDisplayComponents((t) => t.setContent(hint));
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      GIFT_DELIVERY_TYPE_VALUES.map((type) =>
        new ButtonBuilder()
          .setCustomId(customIdFor(type))
          .setLabel(GIFT_DELIVERY_TYPE_LABELS[type] ?? type)
          .setStyle(ButtonStyle.Primary),
      ),
    ),
  );
  return container;
}

export function buildDeliveryTypeMenu(
  hint: string,
  customIdFor: (type: GiftDeliveryType) => string,
): InteractionReplyOptions {
  return {
    components: [typeMenuContainer(hint, customIdFor)],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  };
}

export function buildGiftCommandMenu(input: {
  selectCustomId: string;
  userId: string;
  avatarUrl: string;
  info: string | null;
}): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        (t) => t.setContent(M.typeMenu.sectionTitle),
        (t) => t.setContent(M.typeMenu.sectionTarget(input.userId)),
        (t) => t.setContent(input.info ? M.typeMenu.sectionNote(input.info) : M.typeMenu.selectPrompt),
      )
      .setThumbnailAccessory((thumb) => thumb.setURL(input.avatarUrl)),
  );
  container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(input.selectCustomId)
        .setPlaceholder(M.typeMenu.selectPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          GIFT_DELIVERY_TYPE_VALUES.map((type) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(GIFT_DELIVERY_TYPE_LABELS[type] ?? type)
              .setDescription(M.typeMenu.optionDescriptions[type] ?? type)
              .setValue(type),
          ),
        ),
    ),
  );
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}

function infoField(): LabelBuilder {
  return new LabelBuilder().setLabel(M.modals.infoLabel).setTextInputComponent(
    new TextInputBuilder()
      .setCustomId(GiftClaimModalField.info)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(M.modals.infoPlaceholder)
      .setMaxLength(1000)
      .setRequired(false),
  );
}

function proofField(): LabelBuilder {
  return new LabelBuilder()
    .setLabel(M.modals.proofLabel)
    .setDescription(M.modals.proofDescription)
    .setFileUploadComponent(
      new FileUploadBuilder()
        .setCustomId(GiftClaimModalField.deliveryProof)
        .setMinValues(1)
        .setMaxValues(giftClaimConfig.delivery.maxProofFiles)
        .setRequired(true),
    );
}

export function buildAmountModal(customId: string, prefill?: string | null): ModalBuilder {
  const input = new TextInputBuilder()
    .setCustomId(GiftClaimModalField.amount)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(M.modals.amountPlaceholder)
    .setMaxLength(30)
    .setRequired(true);
  if (prefill) input.setValue(prefill);
  // Credits are transferred by autoclaim, which logs the transfer itself — no proof to upload.
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(M.modals.amountTitle)
    .addLabelComponents(new LabelBuilder().setLabel(M.modals.amountLabel).setTextInputComponent(input));
}

export function buildLinkModal(customId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(M.modals.linkTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(M.modals.linkLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(GiftClaimModalField.link)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(M.modals.linkPlaceholder)
          .setMaxLength(giftClaimConfig.delivery.maxLinkLength)
          .setRequired(true),
      ),
      infoField(),
      proofField(),
    );
}

export function buildProofModal(customId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(M.modals.proofTitle)
    .addLabelComponents(proofField(), infoField());
}

export function buildLinkDeliveryMessage(input: {
  revealCustomId: string;
  claimed: boolean;
  channelNotice: string | null;
}): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(
    input.claimed ? colors.success : colors.primary,
  );
  container.addTextDisplayComponents((t) =>
    t.setContent(input.claimed ? M.user.claimedState : (input.channelNotice ?? M.user.linkReady)),
  );
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(input.revealCustomId)
        .setLabel(M.buttons.reveal)
        .setStyle(ButtonStyle.Success)
        .setDisabled(input.claimed),
    ),
  );
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}
