import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isVacationCustomId, parseVacCustomId } from "./component-ids.ts";
import { handleApplyButton, handleApplyModal } from "./apply.handler.ts";
import {
  handleApproveButton,
  handleInfoButton,
  handleRefuseButton,
  handleRefuseModal,
} from "./decision.handler.ts";

const log = logger.child("vacation:components");

export async function routeVacationComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  if (!isButton && !isModal) return false;
  if (!isVacationCustomId(interaction.customId)) return false;

  const parsed = parseVacCustomId(interaction.customId);
  if (!parsed) return false;
  const { action, args } = parsed;
  const id = args[0] ?? "";

  try {
    if (isButton && action === "apply") await handleApplyButton(interaction);
    else if (isModal && action === "applyModal") await handleApplyModal(interaction);
    else if (isButton && action === "approve") await handleApproveButton(interaction, id);
    else if (isButton && action === "refuse") await handleRefuseButton(interaction, id);
    else if (isModal && action === "refModal") await handleRefuseModal(interaction, id);
    else if (isButton && action === "info") await handleInfoButton(interaction, id);
    else return false;
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}

