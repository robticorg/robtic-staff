import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isTicketCustomId, parseTicketCustomId } from "./component-ids.ts";
import { handlePanelSelect } from "./panel-select.handler.ts";
import { handleQuestionContinue, handleQuestionModal } from "./question-modal.handler.ts";
import { handleTicketClaim } from "./claim.handler.ts";
import {
  handleOptionsAddUser,
  handleOptionsClose,
  handleOptionsOpen,
  handleOptionsRemoveUser,
} from "./options.handler.ts";
import { handleAddUserModal } from "./add-user.handler.ts";
import { handleRemoveUserModal } from "./remove-user.handler.ts";
import { handleFaqSelect } from "./faq-select.handler.ts";

const log = logger.child("tickets:components");

export async function routeTicketComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isString = interaction.isStringSelectMenu();
  const isModal = interaction.isModalSubmit();
  if (!isButton && !isString && !isModal) return false;
  if (!isTicketCustomId(interaction.customId)) return false;

  const parsed = parseTicketCustomId(interaction.customId);
  if (!parsed) return true;

  try {
    await dispatch(interaction, parsed.action, parsed.args, { isButton, isString, isModal });
  } catch (err) {
    log.error(`ticket component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, ticketMessages.common.genericError);
  }
  return true;
}

async function dispatch(
  interaction: Interaction,
  action: string,
  args: string[],
  kind: { isButton: boolean; isString: boolean; isModal: boolean },
): Promise<void> {
  if (kind.isString && interaction.isStringSelectMenu()) {
    if (action === "panelSelect") return handlePanelSelect(interaction);
    if (action === "faqSelect") return handleFaqSelect(interaction, args[0] ?? "");
    return;
  }

  if (kind.isModal && interaction.isModalSubmit()) {
    if (action === "qModal") {
      return handleQuestionModal(interaction, args[0] ?? "", Number(args[1] ?? "1"));
    }
    if (action === "addUserModal") return handleAddUserModal(interaction, args[0] ?? "");
    if (action === "removeUserModal") return handleRemoveUserModal(interaction, args[0] ?? "");
    return;
  }

  if (kind.isButton && interaction.isButton()) {
    switch (action) {
      case "qMore":
        return handleQuestionContinue(interaction, args[0] ?? "", Number(args[1] ?? "1"));
      case "claim":
        return handleTicketClaim(interaction, args[0] ?? "");
      case "options":
        return handleOptionsOpen(interaction, args[0] ?? "");
      case "optClose":
        return handleOptionsClose(interaction, args[0] ?? "");
      case "optAddUser":
        return handleOptionsAddUser(interaction, args[0] ?? "");
      case "optRemoveUser":
        return handleOptionsRemoveUser(interaction, args[0] ?? "");
      default:
        return;
    }
  }
}

