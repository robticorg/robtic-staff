import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isPunishmentCustomId, parsePunCustomId } from "./component-ids.ts";
import { handleResolutionModal, handleResolutionSelect } from "./resolution.handler.ts";
import {
  handleApproveButton,
  handleInfoButton,
  handleRejectButton,
  handleRejectModal,
} from "./approval.handler.ts";
import { handleWhyButton } from "./dm-info.handler.ts";

const log = logger.child("punishment:components");

export async function routePunishmentComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isSelect = interaction.isStringSelectMenu();
  const isModal = interaction.isModalSubmit();
  if (!isButton && !isSelect && !isModal) return false;
  if (!isPunishmentCustomId(interaction.customId)) return false;

  const parsed = parsePunCustomId(interaction.customId);
  if (!parsed) return false;
  const { action, args } = parsed;

  try {
    if (isSelect && action === "resolve") {
      await handleResolutionSelect(interaction, args[0] ?? "");
    } else if (isModal && action === "reason") {
      await handleResolutionModal(interaction, args[0] ?? "", args[1] ?? "");
    } else if (isButton && action === "approve") {
      await handleApproveButton(interaction, args[0] ?? "");
    } else if (isButton && action === "reject") {
      await handleRejectButton(interaction, args[0] ?? "");
    } else if (isButton && action === "info") {
      await handleInfoButton(interaction, args[0] ?? "");
    } else if (isModal && action === "rejmodal") {
      await handleRejectModal(interaction, args[0] ?? "");
    } else if (isButton && action === "why") {
      await handleWhyButton(interaction, args[0] ?? "");
    } else {
      return false;
    }
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}

