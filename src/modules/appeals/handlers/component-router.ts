import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isAppealCustomId, parseAplCustomId } from "./component-ids.ts";
import { handleAppealModal, handleAppealStart } from "./dm.handler.ts";
import {
  handleAcceptButton,
  handleClaim,
  handleDecisionModal,
  handleInfo,
  handleRejectButton,
} from "./review.handler.ts";

const log = logger.child("appeal:components");

export async function routeAppealComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  if (!isButton && !isModal) return false;
  if (!isAppealCustomId(interaction.customId)) return false;

  const parsed = parseAplCustomId(interaction.customId);
  if (!parsed) return false;
  const { action, args } = parsed;
  const id = args[0] ?? "";

  try {
    if (isButton && action === "start") await handleAppealStart(interaction, id);
    else if (isModal && action === "form") await handleAppealModal(interaction, id);
    else if (isButton && action === "claim") await handleClaim(interaction, id);
    else if (isButton && action === "accept") await handleAcceptButton(interaction, id);
    else if (isButton && action === "reject") await handleRejectButton(interaction, id);
    else if (isButton && action === "info") await handleInfo(interaction, id);
    else if (isModal && action === "decide") {
      await handleDecisionModal(interaction, id, args[1] ?? "");
    } else return false;
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}

