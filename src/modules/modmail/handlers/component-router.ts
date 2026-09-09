import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isModmailCustomId } from "./component-ids.ts";
import { handleModmailButton } from "./button.handler.ts";
import { handleModmailModal } from "./modal.handler.ts";

const log = logger.child("modmail:components");

export async function routeModmailComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  if (!isButton && !isModal) return false;
  if (!isModmailCustomId(interaction.customId)) return false;

  try {
    if (isButton) await handleModmailButton(interaction);
    else await handleModmailModal(interaction);
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}

