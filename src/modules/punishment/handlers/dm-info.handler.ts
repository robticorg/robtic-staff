import { MessageFlags, type ButtonInteraction } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { resolutionService } from "../services/resolution.service.ts";

const log = logger.child("punishment:dm-info-handler");

export async function handleWhyButton(
  interaction: ButtonInteraction,
  punishmentId: string,
): Promise<void> {
  try {
    const result = await resolutionService.getWhyInfo(punishmentId, interaction.user.id);
    await interaction.reply({ content: result.text, flags: MessageFlags.Ephemeral });
  } catch (err) {
    log.error(`why-info for ${punishmentId} failed`, err);
    await interaction
      .reply({ content: punishmentMessages.dm.gone, flags: MessageFlags.Ephemeral })
      .catch(() => undefined);
  }
}
