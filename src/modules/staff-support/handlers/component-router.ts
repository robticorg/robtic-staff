import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { isStaffSupportCustomId, parseStaffSupportCustomId } from "./component-ids.ts";
import { handleDemissionFireButton } from "./fire.handler.ts";
import {
  handleBreakButton,
  handleDemissionButton,
  handleDemissionModal,
  handleSupportButton,
  handleSupportModal,
} from "./panel.handler.ts";

const log = logger.child("staff-support:components");

export async function routeStaffSupportComponent(interaction: Interaction): Promise<boolean> {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  if (!isButton && !isModal) return false;
  if (!isStaffSupportCustomId(interaction.customId)) return false;

  const parsed = parseStaffSupportCustomId(interaction.customId);
  if (!parsed) return false;
  const { action, args } = parsed;

  try {
    if (isButton && interaction.isButton()) {
      switch (action) {
        case "support":
          await handleSupportButton(interaction);
          return true;
        case "break":
          await handleBreakButton(interaction);
          return true;
        case "demission":
          await handleDemissionButton(interaction);
          return true;
        case "fire":
          await handleDemissionFireButton(interaction, args[0] ?? "");
          return true;
        default:
          return false;
      }
    }

    if (isModal && interaction.isModalSubmit()) {
      if (action === "supportModal") {
        await handleSupportModal(interaction);
        return true;
      }
      if (action === "demissionModal") {
        await handleDemissionModal(interaction);
        return true;
      }
    }
    return false;
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
    return true;
  }
}
