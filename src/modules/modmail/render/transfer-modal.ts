import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { CustomId, ModmailModalField } from "../handlers/component-ids.ts";

const M = modmailMessages.transfer;

export function buildReportTransferModal(caseId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CustomId.transferModal(caseId))
    .setTitle(M.modalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(M.targetLabel).setUserSelectMenuComponent(
        new UserSelectMenuBuilder()
          .setCustomId(ModmailModalField.transferTarget)
          .setRequired(true)
          .setMinValues(1)
          .setMaxValues(1),
      ),
      new LabelBuilder().setLabel(M.reasonLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(ModmailModalField.transferReason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(M.reasonPlaceholder)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(limits.reasonMaxLength),
      ),
    );
}
