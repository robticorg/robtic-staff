import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../../data/gift-claim/config.ts";
import { giftClaimService } from "../../gift-claims/services/gift-claim.service.ts";
import { buildGiftClaimSubmitModal } from "../../gift-claims/render/modals.ts";
import { runCreateTicket } from "../flow/create-ticket.flow.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { ticketService } from "../services/ticket.service.ts";
import { ticketDraftStore } from "./draft-store.ts";
import { buildQuestionModal } from "../render/question-modal.ts";

const M = ticketMessages;

export async function handlePanelSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const panelId = interaction.values[0];
  const panel = panelId ? ticketConfigService.getPanel(panelId) : undefined;
  if (!panel) {
    await interaction.reply({ content: M.create.unknownPanel, flags: MessageFlags.Ephemeral });
    return;
  }

  if (panel.id === GIFT_CLAIM_PANEL_ID) {
    const gate = await giftClaimService.canCreate(interaction.guildId, interaction.user.id);
    if (!gate.ok) {
      await interaction.reply({
        content: gate.message ?? M.create.failed,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.showModal(buildGiftClaimSubmitModal());
    return;
  }

  const existing = await ticketService.getOpenTicketForUser(interaction.guildId, interaction.user.id);
  if (existing) {
    await interaction.reply({
      content: M.create.alreadyOpen(existing.channelId),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (panel.questions.enabled && panel.questions.items.length > 0) {
    ticketDraftStore.start(interaction.user.id, panel.id);
    await interaction.showModal(buildQuestionModal(panel, 1));
    return;
  }

  await runCreateTicket(interaction, interaction.member, panel, []);
}
