import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { VacCustomId, VacModalField } from "../handlers/component-ids.ts";

const A = vacationMessages.application;
const R = vacationMessages.request;

export function buildApplicationModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(VacCustomId.applyModal())
    .setTitle(A.modalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(A.reasonLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(VacModalField.reason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(A.reasonQuestion)
          .setMaxLength(1000)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(A.durationLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(VacModalField.duration)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(A.durationHint)
          .setMaxLength(8)
          .setRequired(true),
      ),
    );
}

export function buildRefuseModal(vacationId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(VacCustomId.refuseModal(vacationId))
    .setTitle(R.refuseModalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(R.refuseReasonLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(VacModalField.refuseReason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(R.refuseReasonLabel)
          .setMaxLength(800)
          .setRequired(true),
      ),
    );
}
