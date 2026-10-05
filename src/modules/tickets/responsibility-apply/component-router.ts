import { MessageFlags, type ButtonInteraction, type Interaction, type ModalSubmitInteraction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { isUnsetId, panelCreatesChannel, panelIsAdminOnly, type TicketPanelConfig } from "../../../data/tickets/index.ts";
import { RESPONSIBILITY_APPLY_PANEL_ID } from "../../../data/tickets/panels/responsibility-apply.ts";
import { responsibilityApplyMessages } from "../../../data/tickets/responsibility-apply.ts";
import { responsibilityService } from "../../responsibilities/index.ts";
import { runCreateTicket } from "../flow/create-ticket.flow.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { applicationAnswers, validateApplication } from "./answers.ts";
import { ResponsibilityApplyField, parseResponsibilityApplyCustomId } from "./component-ids.ts";
import { buildResponsibilityApplyModal } from "./render.ts";

const log = logger.child("tickets:responsibility-apply");
const E = responsibilityApplyMessages.errors;
const EPHEMERAL = MessageFlags.Ephemeral;

function readyPanel(): TicketPanelConfig | null {
  const panel = ticketConfigService.getPanel(RESPONSIBILITY_APPLY_PANEL_ID);
  if (!panel || panelIsAdminOnly(panel)) return null;
  if (panelCreatesChannel(panel) && isUnsetId(panel.categoryId)) return null;
  return panel;
}

function text(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id);
  } catch {
    return "";
  }
}

function selected(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getStringSelectValues(id)[0] ?? null;
  } catch {
    return null;
  }
}

function checked(interaction: ModalSubmitInteraction, id: string): boolean {
  try {
    return interaction.fields.getCheckbox(id);
  } catch {
    return false;
  }
}

async function handleOpen(interaction: ButtonInteraction<"cached">): Promise<void> {
  if (!readyPanel()) {
    await interaction.reply({ content: E.notConfigured, flags: EPHEMERAL });
    return;
  }
  const responsibilities = await responsibilityService.getResponsibilities(interaction.guildId);
  if (responsibilities.length === 0) {
    await interaction.reply({ content: E.none, flags: EPHEMERAL });
    return;
  }
  await interaction.showModal(buildResponsibilityApplyModal(responsibilities));
}

async function handleSubmit(interaction: ModalSubmitInteraction<"cached">): Promise<void> {
  const panel = readyPanel();
  if (!panel) {
    await interaction.reply({ content: E.notConfigured, flags: EPHEMERAL });
    return;
  }
  const responsibilityId = selected(interaction, ResponsibilityApplyField.responsibility);
  const responsibility = responsibilityId
    ? await responsibilityService.getResponsibility(interaction.guildId, responsibilityId)
    : null;
  if (!responsibility) {
    await interaction.reply({ content: E.responsibilityGone, flags: EPHEMERAL });
    return;
  }

  const application = {
    responsibilityTitle: responsibility.title,
    explain: text(interaction, ResponsibilityApplyField.explain),
    job: text(interaction, ResponsibilityApplyField.job),
    situation: text(interaction, ResponsibilityApplyField.situation),
    committed: checked(interaction, ResponsibilityApplyField.commit),
  };
  const problem = validateApplication(application);
  if (problem) {
    await interaction.reply({ content: problem === "NOT_COMMITTED" ? E.mustCommit : E.fieldsRequired, flags: EPHEMERAL });
    return;
  }

  await runCreateTicket(interaction, interaction.member, panel, applicationAnswers(application), {
    duplicateScope: "PANEL",
    metadata: { responsibilityId: responsibility.responsibilityId },
  });
}

export async function routeResponsibilityApplyComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return false;
  const action = parseResponsibilityApplyCustomId(interaction.customId);
  if (!action) return false;
  if (!interaction.inCachedGuild()) return true;

  try {
    if (action === "open" && interaction.isButton()) await handleOpen(interaction);
    else if (action === "submit" && interaction.isModalSubmit()) await handleSubmit(interaction);
    else return false;
  } catch (err) {
    log.error(`responsibility apply "${action}" failed`, err);
    const content = commonMessages.errors.componentCrashed;
    if (interaction.deferred || interaction.replied) await interaction.followUp({ content, flags: EPHEMERAL }).catch(() => undefined);
    else await interaction.reply({ content, flags: EPHEMERAL }).catch(() => undefined);
  }
  return true;
}
