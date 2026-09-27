import type { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { staffApplicationService } from "../application/staff-application.service.ts";
import { flowUpdate } from "../render/flow-message.ts";
import { departmentStep, genderStep, statusStep } from "../render/flow-steps.ts";
import { applicationDraftStore } from "../shared/application-draft.store.ts";
import {
  APPLICANT_GENDER_VALUES,
  APPLICATION_DEPARTMENT_VALUES,
  ApplicantGender,
  ApplicationType,
  type ApplicationDepartment,
} from "../shared/enums.ts";
import { errorText } from "./reply.ts";

const M = staffApplicationMessages;

function draftFor(interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">) {
  const draft = applicationDraftStore.get(interaction.guildId, interaction.user.id);
  return draft?.type === ApplicationType.NORMAL_APPLICATION ? draft : undefined;
}

async function expired(
  interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
): Promise<void> {
  await interaction.update(flowUpdate(statusStep(M.validation.sessionExpired)));
}

export async function handleStartApply(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!draftFor(interaction)) return expired(interaction);
  await interaction.update(flowUpdate(genderStep()));
}

export async function handleGender(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const value = interaction.values[0];
  if (!draftFor(interaction) || !value || !(APPLICANT_GENDER_VALUES as readonly string[]).includes(value)) {
    return expired(interaction);
  }
  const gender = value as ApplicantGender;
  applicationDraftStore.update(interaction.guildId, interaction.user.id, { gender });
  await interaction.update(flowUpdate(departmentStep(gender === ApplicantGender.FEMALE)));
}

export async function handleDepartment(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const draft = draftFor(interaction);
  const value = interaction.values[0];
  if (
    !draft?.gender ||
    !value ||
    !(APPLICATION_DEPARTMENT_VALUES as readonly string[]).includes(value)
  ) {
    return expired(interaction);
  }

  await interaction.update(flowUpdate(statusStep(M.apply.creating)));
  try {
    const opened = await staffApplicationService.submit(
      interaction.guild,
      interaction.member,
      draft,
      value as ApplicationDepartment,
    );
    applicationDraftStore.clear(interaction.guildId, interaction.user.id);
    await interaction.editReply(flowUpdate(statusStep(M.create.created(opened.channelId))));
  } catch (err) {
    await interaction.editReply(flowUpdate(statusStep(errorText(err))));
  }
}
