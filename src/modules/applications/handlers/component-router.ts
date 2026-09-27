import type { Interaction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { AP_NS, parseApplicationCustomId } from "../shared/component-ids.ts";
import { handleDepartment, handleGender, handleStartApply } from "./apply-steps.handler.ts";
import { handleFirstModal } from "./first-modal.handler.ts";
import { handleApplicationInfo } from "./info.handler.ts";
import {
  handleEvidenceButton,
  handleEvidenceModal,
  handleStartTransfer,
  handleTransferInfo,
} from "./transfer-steps.handler.ts";

const log = logger.child("applications:components");

export async function routeApplicationComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) {
    return false;
  }
  if (!interaction.customId.startsWith(`${AP_NS}:`)) return false;
  const parsed = parseApplicationCustomId(interaction.customId);
  if (!parsed) return false;

  try {
    if (interaction.isButton()) {
      switch (parsed.action) {
        case "startApply":
          await handleStartApply(interaction);
          return true;
        case "startTransfer":
          await handleStartTransfer(interaction);
          return true;
        case "evidence":
          await handleEvidenceButton(interaction);
          return true;
        case "info":
          await handleApplicationInfo(interaction, parsed.args[0] ?? "");
          return true;
        default:
          return false;
      }
    }

    if (interaction.isStringSelectMenu()) {
      switch (parsed.action) {
        case "gender":
          await handleGender(interaction);
          return true;
        case "department":
          await handleDepartment(interaction);
          return true;
        default:
          return false;
      }
    }

    switch (parsed.action) {
      case "first":
        await handleFirstModal(interaction);
        return true;
      case "transferModal":
        await handleTransferInfo(interaction);
        return true;
      case "evidenceModal":
        await handleEvidenceModal(interaction);
        return true;
      default:
        return false;
    }
  } catch (err) {
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
    return true;
  }
}
