import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ticketMessages } from "../../../data/messages/tickets.ts";

const M = ticketMessages.faq;

const FAQ_NS = "faq:addModal";

export const FaqAddModal = {
  /** `panelId` empty means "show on every panel". */
  id: (panelId: string) => `${FAQ_NS}:${panelId}`,
  parsePanelId: (customId: string): string | null => {
    if (!customId.startsWith(`${FAQ_NS}:`)) return null;
    return customId.slice(FAQ_NS.length + 1);
  },
  questionField: "question",
  answerField: "answer",
} as const;

export function buildFaqAddModal(panelId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(FaqAddModal.id(panelId))
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
