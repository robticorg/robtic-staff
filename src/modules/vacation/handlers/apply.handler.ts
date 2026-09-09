import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { formatDuration } from "../services/duration.ts";
import { vacationService } from "../services/vacation.service.ts";
import { buildApplicationModal } from "../render/modals.ts";
import { VacModalField } from "./component-ids.ts";

const log = logger.child("vacation:apply-handler");
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleApplyButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.showModal(buildApplicationModal());
}

export async function handleApplyModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const reasonInput = safeField(interaction, VacModalField.reason);
  const durationInput = safeField(interaction, VacModalField.duration);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const { vacation } = await vacationService.createApplication({
      guildId: interaction.guildId,
      member: interaction.member,
      reasonInput,
      durationInput,
    });
    await interaction.editReply(
      vacationMessages.application.submitted(
        formatDuration({ value: vacation.duration, unit: vacation.durationUnit }),
      ),
    );
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("application modal failed", err);
    await interaction.editReply(vacationMessages.application.channelUnavailable);
  }
}

function safeField(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}
