import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketAnswer } from "../models/ticket.model.ts";
import { runCreateTicket } from "../flow/create-ticket.flow.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { buildQuestionModal } from "../render/question-modal.ts";
import { TicketCustomId, TicketModalField } from "./component-ids.ts";
import { ticketDraftStore } from "./draft-store.ts";

const M = ticketMessages;

export async function handleQuestionModal(
  interaction: ModalSubmitInteraction,
  panelId: string,
  page: number,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const panel = ticketConfigService.getPanel(panelId);
  if (!panel) {
    await interaction.reply({ content: M.create.unknownPanel, flags: MessageFlags.Ephemeral });
    return;
  }

  const pageQuestions = ticketConfigService.questionsForPage(panel, page);
  const answers: Record<string, string> = {};
  for (const q of pageQuestions) {
    const field = TicketModalField.answer(q.id);
    answers[q.id] = safeField(interaction, field);
  }
  ticketDraftStore.merge(interaction.user.id, panel.id, answers);

  const totalPages = ticketConfigService.questionPageCount(panel);
  if (page < totalPages) {
    await interaction.reply({
      content: M.questions.pageIndicator(page, totalPages),
      flags: MessageFlags.Ephemeral,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(TicketCustomId.questionContinue(panel.id, page + 1))
            .setLabel(M.questions.continueButton)
            .setStyle(ButtonStyle.Primary),
        ),
      ],
    });
    return;
  }

  const draft = ticketDraftStore.get(interaction.user.id, panel.id);
  const collected = draft?.answers ?? answers;
  ticketDraftStore.clear(interaction.user.id);

  const ordered: TicketAnswer[] = panel.questions.items
    .filter((q) => collected[q.id] !== undefined && collected[q.id] !== "")
    .map((q) => ({ questionId: q.id, question: q.label, answer: collected[q.id] ?? "" }));

  await runCreateTicket(interaction, interaction.member, panel, ordered);
}

export async function handleQuestionContinue(
  interaction: ButtonInteraction,
  panelId: string,
  page: number,
): Promise<void> {
  const panel = ticketConfigService.getPanel(panelId);
  if (!panel) {
    await interaction.reply({ content: M.create.unknownPanel, flags: MessageFlags.Ephemeral });
    return;
  }
  const draft = ticketDraftStore.get(interaction.user.id, panel.id);
  if (!draft) {
    await interaction.reply({ content: M.questions.expired, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(buildQuestionModal(panel, page));
}

function safeField(interaction: ModalSubmitInteraction, customId: string): string {
  try {
    return interaction.fields.getTextInputValue(customId).trim();
  } catch {
    return "";
  }
}
