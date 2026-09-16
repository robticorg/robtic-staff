import { MessageFlags, type ButtonInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { buildDemissionCard } from "../render/demission-card.ts";
import { staffSupportService } from "../services/staff-support.service.ts";

const log = logger.child("staff-support:fire");
const D = staffSupportMessages.demission;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

/**
 * The فصل الموظف button. Thin on purpose: every rule — authorization against
 * the applicant's live tier, the atomic claim, and the fire itself — lives in
 * StaffSupportService.
 */
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
      // Somebody else already actioned it — refresh the card so the stale
      // button disappears for everyone still looking at it.
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

/** Re-renders the card from the stored request, which drops the fire button. */
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
