import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { faqService } from "../services/faq.service.ts";
import { ticketService } from "../services/ticket.service.ts";

const log = logger.child("tickets:faq");
const M = ticketMessages;

export async function handleFaqSelect(
  interaction: StringSelectMenuInteraction,
  ticketId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const faqId = interaction.values[0];
  if (!faqId) return;

  try {
    const ticket = await ticketService.getTicket(ticketId);
    if (!ticket || ticket.guildId !== interaction.guildId) {
      await interaction.reply({ content: M.common.ticketGone, flags: MessageFlags.Ephemeral });
      return;
    }
    const faq = await faqService.get(interaction.guildId, faqId);
    if (!faq) {
      await interaction.reply({ content: M.faq.notFound, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({
      content: `**${faq.question}**\n${faq.answer}`,
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    log.error("faq select failed", err);
    if (!interaction.replied) {
      await interaction
        .reply({ content: M.common.genericError, flags: MessageFlags.Ephemeral })
        .catch(() => undefined);
    }
  }
}
