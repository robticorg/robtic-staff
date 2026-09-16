import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketCustomId, TicketModalField } from "../handlers/component-ids.ts";

const M = ticketMessages.renameTicket;

export function buildRenameModal(ticketId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(TicketCustomId.renameModal(ticketId))
    .setTitle(M.modalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(M.nameLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(TicketModalField.newName)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(M.namePlaceholder)
          .setRequired(true)
          .setMaxLength(90),
      ),
    );
}
