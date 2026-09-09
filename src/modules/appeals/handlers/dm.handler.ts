import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { appealMessages } from "../../../data/appeals/messages.ts";
import { appealService } from "../services/appeal.service.ts";
import { buildAppealModal } from "../render/modals.ts";
import { AplModalField } from "./component-ids.ts";

const log = logger.child("appeal:dm-handler");
const D = appealMessages.dm;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleAppealStart(
  interaction: ButtonInteraction,
  punishmentId: string,
): Promise<void> {
  const eligibility = await appealService.canAppeal({
    userId: interaction.user.id,
    punishmentId,
  });
  if (!eligibility.ok) {
    await interaction.reply({ content: eligibility.message, ...EPHEMERAL });
    return;
  }
  await interaction.showModal(buildAppealModal(punishmentId));
}

export async function handleAppealModal(
  interaction: ModalSubmitInteraction,
  punishmentId: string,
): Promise<void> {
  const reason = safeField(interaction, AplModalField.reason);
  const evidence = safeField(interaction, AplModalField.evidence)
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await appealService.createAppeal({
      userId: interaction.user.id,
      punishmentId,
      reason,
      evidence,
    });
    await interaction.editReply(D.submitted);
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("appeal creation failed", err);
    await interaction.editReply(D.systemUnavailable);
  }
}

function safeField(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}
