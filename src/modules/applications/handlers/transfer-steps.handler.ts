import type { ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { staffTransferRules } from "../../../data/staff-application/config.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { flowUpdate } from "../render/flow-message.ts";
import {
  buildEvidenceModal,
  buildTransferInfoModal,
  evidenceStep,
  statusStep,
} from "../render/flow-steps.ts";
import { applicationDraftStore } from "../shared/application-draft.store.ts";
import { ApplicationField } from "../shared/component-ids.ts";
import { ApplicationType } from "../shared/enums.ts";
import { staffTransferApplicationService } from "../transfer/staff-transfer-application.service.ts";
import type { UploadedEvidence } from "../transfer/transfer-evidence.service.ts";
import { errorText, replyWithError } from "./reply.ts";

const M = staffApplicationMessages;

function draftFor(guildId: string, userId: string) {
  const draft = applicationDraftStore.get(guildId, userId);
  return draft?.type === ApplicationType.TRANSFER_APPLICATION ? draft : undefined;
}

function text(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id);
  } catch {
    return "";
  }
}

function belowMinimumNotice(memberCount: number): string | null {
  const min = staffTransferRules.minimumSourceMemberCount;
  return memberCount < min ? M.transfer.belowMinimumNotice(min) : null;
}

export async function handleStartTransfer(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!draftFor(interaction.guildId, interaction.user.id)) {
    await interaction.update(flowUpdate(statusStep(M.validation.sessionExpired)));
    return;
  }
  await interaction.showModal(buildTransferInfoModal());
}

export async function handleTransferInfo(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild() || !interaction.isFromMessage()) return;
  if (!draftFor(interaction.guildId, interaction.user.id)) {
    await interaction.update(flowUpdate(statusStep(M.validation.sessionExpired)));
    return;
  }

  try {
    const info = await staffTransferApplicationService.verifyInvite(
      interaction.guild,
      text(interaction, ApplicationField.invite),
    );
    applicationDraftStore.update(interaction.guildId, interaction.user.id, { transfer: info });
    await interaction.update(flowUpdate(evidenceStep(belowMinimumNotice(info.memberCount))));
  } catch (err) {
    await replyWithError(interaction, err);
  }
}

export async function handleEvidenceButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!draftFor(interaction.guildId, interaction.user.id)?.transfer) {
    await interaction.update(flowUpdate(statusStep(M.validation.sessionExpired)));
    return;
  }
  await interaction.showModal(buildEvidenceModal());
}

export async function handleEvidenceModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild() || !interaction.isFromMessage()) return;
  const draft = draftFor(interaction.guildId, interaction.user.id);
  if (!draft?.transfer) {
    await interaction.update(flowUpdate(statusStep(M.validation.sessionExpired)));
    return;
  }

  let uploads: UploadedEvidence[] = [];
  try {
    const files = interaction.fields.getUploadedFiles(ApplicationField.evidence) ?? new Map();
    uploads = [...files.values()].map((file) => ({
      name: file.name,
      url: file.url,
      contentType: file.contentType,
      size: file.size,
    }));
  } catch {
    uploads = [];
  }

  await interaction.update(flowUpdate(statusStep(M.transfer.creating)));
  try {
    const opened = await staffTransferApplicationService.submit(
      interaction.guild,
      interaction.member,
      draft,
      uploads,
    );
    applicationDraftStore.clear(interaction.guildId, interaction.user.id);
    await interaction.editReply(flowUpdate(statusStep(M.create.created(opened.channelId))));
  } catch (err) {
    const retry = evidenceStep(null);
    await interaction.editReply(
      flowUpdate({ ...retry, blocks: [...retry.blocks, errorText(err)] }),
    );
  }
}
