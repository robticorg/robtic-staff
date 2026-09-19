import {
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { warnPanelMessages } from "../../../data/warn-panel/messages.ts";
import { warningPanelService } from "../services/warning-panel.service.ts";

const log = logger.child("warn-panel:handlers");
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handlePanelSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await warningPanelService.handleSelection(interaction, interaction.values[0] ?? "");
}

export const handleTimeoutModal = submitHandler((i) => warningPanelService.submitTimeout(i));
export const handleJailModal = submitHandler((i) => warningPanelService.submitJail(i));
export const handleUserWarnModal = submitHandler((i) => warningPanelService.submitUserWarning(i));
export const handleStaffWarnModal = submitHandler((i) =>
  warningPanelService.submitStaffWarning(i),
);

/**
 * Every modal submit follows the same shape: defer, run the service, report what
 * it returned. A DomainError is a rejection the manager should read; anything else
 * is a bug and never reads as success.
 */
function submitHandler(
  run: (interaction: ModalSubmitInteraction<"cached">) => Promise<string>,
): (interaction: ModalSubmitInteraction) => Promise<void> {
  return async (interaction) => {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply(EPHEMERAL);

    try {
      await interaction.editReply(await run(interaction));
    } catch (err) {
      if (err instanceof DomainError) {
        await interaction.editReply(err.message);
        return;
      }
      log.error(`warn panel modal "${interaction.customId}" failed`, err);
      await interaction.editReply(warnPanelMessages.errors.crashed);
    }
  };
}
