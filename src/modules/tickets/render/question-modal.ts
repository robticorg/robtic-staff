import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig, TicketQuestion } from "../../../data/tickets/index.ts";
import { TicketCustomId, TicketModalField } from "../handlers/component-ids.ts";

export function buildQuestionModal(panel: TicketPanelConfig, page: number): ModalBuilder {
  const size = limits.ticketQuestionsPerModal;
  const pageQuestions = panel.questions.items.slice((page - 1) * size, page * size);

  const modal = new ModalBuilder()
    .setCustomId(TicketCustomId.questionModal(panel.id, page))
    .setTitle(ticketMessages.questions.modalTitle(panel.name));

  for (const q of pageQuestions) {
    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel(q.label.slice(0, 45))
        .setTextInputComponent(textInputFor(q)),
    );
  }

  return modal;
}

function textInputFor(q: TicketQuestion): TextInputBuilder {
  const input = new TextInputBuilder()
    .setCustomId(TicketModalField.answer(q.id))
    .setStyle(q.style === "PARAGRAPH" ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(q.required ?? false);
  if (q.placeholder) input.setPlaceholder(q.placeholder.slice(0, 100));
  if (typeof q.minLength === "number") input.setMinLength(clamp(q.minLength, 0, 4000));
  if (typeof q.maxLength === "number") input.setMaxLength(clamp(q.maxLength, 1, 4000));
  return input;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
