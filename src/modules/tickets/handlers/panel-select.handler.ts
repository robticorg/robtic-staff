import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../../data/gift-claim/config.ts";
import { giftClaimService } from "../../gift-claims/services/gift-claim.service.ts";
import { StaffApplicationWorkflow } from "../../../data/staff-application/panels.ts";
import { openApplicationEntry } from "../../applications/handlers/first-modal.handler.ts";
import { isBlacklistedFor } from "../services/ticket-blacklist.ts";
import { buildGiftClaimSubmitModal } from "../../gift-claims/render/modals.ts";
import { runCreateTicket } from "../flow/create-ticket.flow.ts";
import { buildTicketPanelMessage } from "../render/panel-message.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { ticketService } from "../services/ticket.service.ts";
import { ticketDraftStore } from "./draft-store.ts";
import { IntakeClosedError, intakeService } from "../../intake/services/intake.service.ts";
import { buildQuestionModal } from "../render/question-modal.ts";
import { intakeMessages } from "../../../data/intake/messages.ts";

const M = ticketMessages;
const log = logger.child("tickets:panel-select");

async function resetPanelMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    if (!interaction.message.editable) return;
    const main = ticketConfigService.getMainConfig();
    const panels = await ticketConfigService.listOpenPublicPanels(interaction.guild!);
    await interaction.message.edit(buildTicketPanelMessage(main, panels));
  } catch (err) {
    log.warn("panel select menu reset failed", err);
  }
}

export async function handlePanelSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  try {
    const panelId = interaction.values[0];
    const panel = panelId ? ticketConfigService.getPanel(panelId, interaction.guildId) : undefined;

    if (!panel || panel.hidden) {
      await interaction.reply({ content: M.create.unknownPanel, flags: MessageFlags.Ephemeral });
      return;
    }

    // A menu sent before the type lost its setup can still offer it: it counts as closed.
    if (!(await ticketConfigService.isPanelReady(interaction.guild, panel))) {
      await interaction.reply({ content: intakeMessages.closed(panel.name, null), flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await intakeService.assertPanelOpen(interaction.guildId, panel.id);
    } catch (err) {
      if (!(err instanceof IntakeClosedError)) throw err;
      await interaction.reply({ content: err.message, flags: MessageFlags.Ephemeral });
      return;
    }

    if (panel.id === StaffApplicationWorkflow.STAFF_APPLICATION) {
      await openApplicationEntry(interaction);
      return;
    }

    if (panel.id === GIFT_CLAIM_PANEL_ID) {
      const gate = await giftClaimService.canCreate(interaction.member);
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

    if (await isBlacklistedFor(interaction.member, panel)) {
      await interaction.reply({ content: M.blacklist.blocked, flags: MessageFlags.Ephemeral });
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
  } finally {
    await resetPanelMenu(interaction);
  }
}
