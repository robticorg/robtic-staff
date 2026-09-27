import { MessageFlags, type RepliableInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";

const log = logger.child("applications:reply");

export function errorText(err: unknown): string {
  if (err instanceof DomainError) return err.message;
  log.error("application interaction failed", err);
  return staffApplicationMessages.create.failed;
}

export async function replyWithError(interaction: RepliableInteraction, err: unknown): Promise<void> {
  const content = errorText(err);
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => undefined);
    return;
  }
  await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => undefined);
}
