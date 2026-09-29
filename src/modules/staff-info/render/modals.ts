import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { staffInfoLimits as L } from "../../../data/staff-info/config.ts";
import { staffInfoMessages } from "../../../data/staff-info/messages.ts";
import { StaffInfoCustomId, StaffInfoField } from "../handlers/component-ids.ts";

const M = staffInfoMessages.modal;

function contentInput(): TextInputBuilder {
  return new TextInputBuilder()
    .setCustomId(StaffInfoField.content)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(M.contentPlaceholder)
    .setMaxLength(L.contentMaxLength)
    .setRequired(true);
}

/** /info add — name, description, and the content that becomes page 1. */
export function buildInfoAddModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(StaffInfoCustomId.addModal())
    .setTitle(M.addTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(M.nameLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(StaffInfoField.name)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(M.namePlaceholder)
          .setMaxLength(L.nameMaxLength)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(M.descriptionLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(StaffInfoField.description)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(M.descriptionPlaceholder)
          .setMaxLength(L.descriptionMaxLength)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(M.contentLabel).setTextInputComponent(contentInput()),
    );
}

/** /info page add — content only. */
export function buildInfoPageModal(infoId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(StaffInfoCustomId.pageModal(infoId))
    .setTitle(M.pageTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(M.contentLabel).setTextInputComponent(contentInput()),
    );
}
