import { MessageFlags, type Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { FaqAddModal } from "./faq-modal.ts";
import { faqService } from "../services/faq.service.ts";

const log = logger.child("tickets:faq-add");
const M = ticketMessages.faq;

export async function routeFaqComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isModalSubmit() || interaction.customId !== FaqAddModal.id) return false;
  if (!interaction.inCachedGuild()) return true;

  const question = safe(interaction, FaqAddModal.questionField);
  const answer = safe(interaction, FaqAddModal.answerField);
  if (!question || !answer) {
    await interaction.reply({ content: M.bothRequired, flags: MessageFlags.Ephemeral });
    return true;
  }

  try {
    const faq = await faqService.add({
      guildId: interaction.guildId,
      question,
      answer,
      createdBy: interaction.user.id,
    });
    await interaction.reply({ content: M.added(faq.question), flags: MessageFlags.Ephemeral });
  } catch (err) {
    log.error("faq add failed", err);
    await interaction.reply({
      content: ticketMessages.common.genericError,
      flags: MessageFlags.Ephemeral,
    });
  }
  return true;
}

function safe(interaction: { fields: { getTextInputValue: (id: string) => string } }, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}
