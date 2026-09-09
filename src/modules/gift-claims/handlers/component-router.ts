import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isGiftClaimCustomId, parseGiftClaimCustomId } from "./component-ids.ts";
import {
  handleApprove,
  handleDone,
  handleFulfillModal,
  handleGiftClaimSubmitModal,
  handleRejectButton,
  handleRejectModal,
} from "./review.handler.ts";

const log = logger.child("gift-claim:components");

export async function routeGiftClaimComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  if (!isButton && !isModal) return false;
  if (!isGiftClaimCustomId(interaction.customId)) return false;

  const parsed = parseGiftClaimCustomId(interaction.customId);
  if (!parsed) return false;
  const { action, args } = parsed;
  const id = args[0] ?? "";

  try {
    if (isModal && action === "submit") await handleGiftClaimSubmitModal(interaction);
    else if (isButton && action === "approve") await handleApprove(interaction, id);
    else if (isButton && action === "reject") await handleRejectButton(interaction, id);
    else if (isButton && action === "done") await handleDone(interaction, id);
    else if (isModal && action === "rejmodal") await handleRejectModal(interaction, id);
    else if (isModal && action === "fulmodal") await handleFulfillModal(interaction, id);
    else return false;
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}
