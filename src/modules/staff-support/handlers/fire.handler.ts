import { MessageFlags, type ButtonInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { buildDemissionCard } from "../render/demission-card.ts";
import { staffSupportService } from "../services/staff-support.service.ts";

const log = logger.child("staff-support:fire");
const D = staffSupportMessages.demission;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleDemissionFireButton(
  interaction: ButtonInteraction,
  requestId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  await interaction.deferReply(EPHEMERAL);
  try {
    const outcome = await staffSupportService.handleDemissionFire({
      guild: interaction.guild,
      requestId,
      manager: interaction.member,
    });

    if (!outcome.ok) {
      await interaction.editReply(outcome.message);

      if (outcome.reason === "ALREADY_HANDLED") await refreshCard(interaction, requestId);
      return;
    }

    await interaction.editReply(D.fired(outcome.targetId));
    await refreshCard(interaction, requestId);
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("demission fire failed", err);
    await interaction.editReply(D.fireFailed);
  }
}

async function refreshCard(
  interaction: ButtonInteraction,
  requestId: string,
): Promise<void> {
  const request = await staffSupportService.getRequest(requestId);
  if (!request) return;
  await interaction.message
    .edit(buildDemissionCard(request))
    .catch((err) => log.warn("demission card refresh failed", err));
}
