import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ticketMessages } from "../../../data/messages/tickets.ts";

const M = ticketMessages.faq;

export const FaqAddModal = {
  id: "faq:addModal",
  questionField: "question",
  answerField: "answer",
} as const;

export function buildFaqAddModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(FaqAddModal.id)
    .setTitle(M.modalTitle)
    .addLabelComponents(
      new LabelBuilder().setLabel(M.questionLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(FaqAddModal.questionField)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(M.questionPlaceholder)
          .setMaxLength(250)
          .setRequired(true),
      ),
      new LabelBuilder().setLabel(M.answerLabel).setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(FaqAddModal.answerField)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(M.answerPlaceholder)
          .setMaxLength(2000)
          .setRequired(true),
      ),
    );
}
