import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isWarnPanelCustomId, parseWarnPanelCustomId } from "./component-ids.ts";
import {
  handleJailModal,
  handlePanelSelect,
  handleStaffWarnModal,
  handleTimeoutModal,
  handleUserWarnModal,
} from "./panel.handler.ts";

const log = logger.child("warn-panel:components");

export async function routeWarningPanelComponent(interaction: Interaction): Promise<boolean> {
  const isSelect = interaction.isStringSelectMenu();
  const isModal = interaction.isModalSubmit();
  if (!isSelect && !isModal) return false;
  if (!isWarnPanelCustomId(interaction.customId)) return false;

  const action = parseWarnPanelCustomId(interaction.customId);
  if (!action) return false;

  try {
    if (isSelect && interaction.isStringSelectMenu()) {
      if (action === "select") {
        await handlePanelSelect(interaction);
        return true;
      }
      return false;
    }

    if (isModal && interaction.isModalSubmit()) {
      switch (action) {
        case "timeoutModal":
          await handleTimeoutModal(interaction);
          return true;
        case "jailModal":
          await handleJailModal(interaction);
          return true;
        case "userWarnModal":
          await handleUserWarnModal(interaction);
          return true;
        case "staffWarnModal":
          await handleStaffWarnModal(interaction);
          return true;
        default:
          return false;
      }
    }
    return false;
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
    return true;
  }
}
