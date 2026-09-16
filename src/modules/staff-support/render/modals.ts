import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { StaffSupportCustomId, StaffSupportModalField } from "../handlers/component-ids.ts";

const S = staffSupportMessages.support;
const D = staffSupportMessages.demission;

function reasonModal(
  customId: string,
  title: string,
  label: string,
  placeholder: string,
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addLabelComponents(
      new LabelBuilder().setLabel(label).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(StaffSupportModalField.reason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(placeholder)
          .setMinLength(3)
          .setMaxLength(1000)
          .setRequired(true),
      ),
    );
}

export function buildSupportModal(): ModalBuilder {
  return reasonModal(
    StaffSupportCustomId.supportModal(),
    S.modalTitle,
    S.reasonLabel,
    S.reasonPlaceholder,
  );
}

export function buildDemissionModal(): ModalBuilder {
  return reasonModal(
    StaffSupportCustomId.demissionModal(),
    D.modalTitle,
    D.reasonLabel,
    D.reasonPlaceholder,
  );
}
