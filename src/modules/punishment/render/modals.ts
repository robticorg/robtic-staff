import {
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { TIMEOUT_PRESETS } from "../services/duration.service.ts";
import { PunishmentType } from "../types/enums.ts";
import { PunCustomId, PunModalField } from "../handlers/component-ids.ts";

const M = punishmentMessages.resolution;

export function buildReasonModal(caseId: string, type: PunishmentType): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(PunCustomId.reasonModal(caseId, type))
    .setTitle(M.reasonModalTitle(type));

  const reasonInput = new TextInputBuilder()
    .setCustomId(PunModalField.reason)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(M.reasonPlaceholder)
    .setMaxLength(1500)
    .setRequired(type !== PunishmentType.NO_ACTION);

  modal.addLabelComponents(new LabelBuilder().setLabel(M.reasonLabel).setTextInputComponent(reasonInput));

  if (type === PunishmentType.TIMEOUT) {
    modal.addLabelComponents(
      new LabelBuilder().setLabel(M.durationLabel).setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId(PunModalField.duration)
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(
            TIMEOUT_PRESETS.map((p) =>
              new StringSelectMenuOptionBuilder().setLabel(p.label).setValue(p.value),
            ),
          ),
      ),
    );
  }

  return modal;
}

export function buildRejectModal(approvalId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(PunCustomId.rejectModal(approvalId))
    .setTitle(punishmentMessages.approval.rejectModalTitle)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(punishmentMessages.approval.rejectReasonLabel)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(PunModalField.rejectReason)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(punishmentMessages.approval.rejectReasonPlaceholder)
            .setMaxLength(800)
            .setRequired(true),
        ),
    );
}

export function resolutionSelectOptions(): StringSelectMenuOptionBuilder[] {
  const order: PunishmentType[] = [
    PunishmentType.NO_ACTION,
    PunishmentType.WARN,
    PunishmentType.TIMEOUT,
    PunishmentType.MUTE,
    PunishmentType.JAIL,
    PunishmentType.KICK,
    PunishmentType.BAN,
  ];
  return order.map((type) => {
    const opt = M.options[type];
    return new StringSelectMenuOptionBuilder()
      .setLabel(opt.label)
      .setDescription(opt.description)
      .setValue(type);
  });
}
