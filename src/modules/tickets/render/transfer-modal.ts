import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketCustomId, TicketModalField } from "../handlers/component-ids.ts";

const M = ticketMessages.transfer;

export function buildTransferModal(ticketId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(TicketCustomId.transferModal(ticketId))
    .setTitle(M.modalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(M.targetLabel).setUserSelectMenuComponent(
        new UserSelectMenuBuilder()
          .setCustomId(TicketModalField.transferTarget)
          .setRequired(true)
          .setMinValues(1)
          .setMaxValues(1),
      ),

      new LabelBuilder().setLabel(M.reasonLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(TicketModalField.transferReason)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(M.reasonPlaceholder)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(limits.reasonMaxLength),
      ),
    );
}
