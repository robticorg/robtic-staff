import {
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { buildFirstModal } from "../render/first-modal.ts";
import { flowReply } from "../render/flow-message.ts";
import { applyIntroStep, transferIntroStep } from "../render/flow-steps.ts";
import { applicationEligibilityService } from "../services/application-eligibility.service.ts";
import { staffRecruitmentService } from "../services/staff-recruitment.service.ts";
import { parseApplicantIdentity } from "../shared/applicant-input.ts";
import { applicationDraftStore } from "../shared/application-draft.store.ts";
import { ApplicationField } from "../shared/component-ids.ts";
import { APPLICATION_TYPE_VALUES, ApplicationType } from "../shared/enums.ts";
import { replyWithError } from "./reply.ts";
import { intakeService } from "../../intake/services/intake.service.ts";

const V = staffApplicationMessages.validation;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

function checkbox(interaction: ModalSubmitInteraction, id: string): boolean {
  try {
    return interaction.fields.getCheckbox(id);
  } catch {
    return false;
  }
}

function textValue(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id);
  } catch {
    return "";
  }
}

function selectValue(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getStringSelectValues(id)[0] ?? null;
  } catch {
    return null;
  }
}

function selectedUserId(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getSelectedUsers(id)?.first()?.id ?? null;
  } catch {
    return null;
  }
}

export async function openApplicationEntry(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  try {
    await applicationEligibilityService.assertCanApply(interaction.member);
  } catch (err) {
    await replyWithError(interaction, err);
    return;
  }
  await interaction.showModal(buildFirstModal());
}

export async function handleFirstModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  if (!checkbox(interaction, ApplicationField.terms)) {
    await interaction.reply({ content: V.termsRequired, ...EPHEMERAL });
    return;
  }

  const identity = parseApplicantIdentity(textValue(interaction, ApplicationField.identity));
  if (!identity.ok) {
    await interaction.reply({
      content: identity.problem === "AGE" ? V.ageInvalid : V.identityInvalid,
      ...EPHEMERAL,
    });
    return;
  }

  const type = selectValue(interaction, ApplicationField.type);
  if (!type || !(APPLICATION_TYPE_VALUES as readonly string[]).includes(type)) {
    await interaction.reply({ content: V.typeRequired, ...EPHEMERAL });
    return;
  }

  try {
    await intakeService.assertApplicationOpen(interaction.guildId, type as ApplicationType);
    await applicationEligibilityService.assertCanApply(interaction.member);
    const submittedAt = new Date();
    const recruiter = await staffRecruitmentService.relationshipForNewApplication(
      interaction.guild,
      interaction.user.id,
      selectedUserId(interaction, ApplicationField.recruiter),
      submittedAt,
    );

    applicationDraftStore.start({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      type: type as ApplicationType,
      name: identity.name,
      age: identity.age,
      city: identity.city,
      termsAccepted: true,
      recruiterStaffId: recruiter.recruiterStaffId,
      recruiterAssignedAt: recruiter.recruiterAssignedAt ?? null,
    });
  } catch (err) {
    await replyWithError(interaction, err);
    return;
  }

  await interaction.reply(
    flowReply(type === ApplicationType.TRANSFER_APPLICATION ? transferIntroStep() : applyIntroStep()),
  );
}
