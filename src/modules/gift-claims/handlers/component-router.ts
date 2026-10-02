import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isGiftClaimCustomId, parseGiftClaimCustomId } from "./component-ids.ts";
import {
  handleGiftClaimSubmitModal,
  handleRejectButton,
  handleRejectModal,
} from "./review.handler.ts";
import {
  handleAmountModal,
  handleApprove,
  handleDeliverButton,
  handleLinkModal,
  handleProofModal,
  handleRetry,
  handleReveal,
  handleTypeChoice,
} from "./delivery.handler.ts";
import {
  handleCommandAmountModal,
  handleCommandLinkModal,
  handleCommandProofModal,
  handleCommandRequestModal,
  handleCommandType,
} from "./gift-command.handler.ts";

const log = logger.child("gift-claim:components");

export async function routeGiftClaimComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  const isSelect = interaction.isStringSelectMenu();
  if (!isButton && !isModal && !isSelect) return false;
  if (!isGiftClaimCustomId(interaction.customId)) return false;

  const parsed = parseGiftClaimCustomId(interaction.customId);
  if (!parsed) return false;
  const { action, args } = parsed;
  const id = args[0] ?? "";

  try {
    if (interaction.isModalSubmit()) {
      if (action === "submit") await handleGiftClaimSubmitModal(interaction);
      else if (action === "rejmodal") await handleRejectModal(interaction, id);
      else if (action === "amount") await handleAmountModal(interaction, id);
      else if (action === "link") await handleLinkModal(interaction, id);
      else if (action === "proof") await handleProofModal(interaction, id);
      else if (action === "camount") await handleCommandAmountModal(interaction, id);
      else if (action === "clink") await handleCommandLinkModal(interaction, id);
      else if (action === "cproof") await handleCommandProofModal(interaction, id);
      else if (action === "creq") await handleCommandRequestModal(interaction, id, args[1]);
      else return false;
    } else if (interaction.isButton()) {
      if (action === "approve") await handleApprove(interaction, id);
      else if (action === "reject") await handleRejectButton(interaction, id);
      else if (action === "type") await handleTypeChoice(interaction, id, args[1]);
      else if (action === "deliver") await handleDeliverButton(interaction, id);
      else if (action === "retry") await handleRetry(interaction, id);
      else if (action === "reveal") await handleReveal(interaction, id);
      else return false;
    } else if (interaction.isStringSelectMenu()) {
      if (action === "ctype") await handleCommandType(interaction, id);
      else return false;
    } else return false;
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}
