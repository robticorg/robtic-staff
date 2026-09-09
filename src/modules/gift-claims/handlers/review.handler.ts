import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { giftClaimMessages } from "../../../data/gift-claim/messages.ts";
import { giftClaimPermissionService } from "../services/gift-claim-permissions.ts";
import { giftClaimService } from "../services/gift-claim.service.ts";
import { buildFulfillModal, buildRejectModal } from "../render/modals.ts";
import { GiftClaimModalField } from "./component-ids.ts";

const log = logger.child("gift-claim:review-handler");
const R = giftClaimMessages.review;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleGiftClaimSubmitModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const reward = safeField(interaction, GiftClaimModalField.reward);
  const details = safeField(interaction, GiftClaimModalField.details);
  const proofUrl = firstUploadedUrl(interaction, GiftClaimModalField.proof);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (!reward) throw new DomainError("GIFT_REWARD_REQUIRED", giftClaimMessages.create.rewardRequired);
    if (!proofUrl) throw new DomainError("GIFT_PROOF_REQUIRED", giftClaimMessages.create.proofRequired);

    await giftClaimService.createFromModal({
      guildId: interaction.guildId,
      member: interaction.member,
      rewardName: reward,
      prize: details || undefined,
      proofUrl,
    });
    await interaction.editReply(giftClaimMessages.create.submittedAck);
  } catch (err) {
    await replyError(interaction, err, "submit");
  }
}

export async function handleApprove(
  interaction: ButtonInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await giftClaimService.approveClaim({ claimId, manager: interaction.member });
    await interaction.editReply(R.approvedAck);
  } catch (err) {
    await replyError(interaction, err, "approve");
  }
}

export async function handleRejectButton(
  interaction: ButtonInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!(await giftClaimPermissionService.isGiftManager(interaction.member))) {
    await interaction.reply({ content: R.notAuthorized, ...EPHEMERAL });
    return;
  }
  await interaction.showModal(buildRejectModal(claimId));
}

export async function handleRejectModal(
  interaction: ModalSubmitInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const reason = safeField(interaction, GiftClaimModalField.rejectReason);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await giftClaimService.rejectClaim({ claimId, manager: interaction.member, reason });
    await interaction.editReply(R.rejectedAck);
  } catch (err) {
    await replyError(interaction, err, "reject");
  }
}

export async function handleDone(
  interaction: ButtonInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!(await giftClaimPermissionService.isGiftManager(interaction.member))) {
    await interaction.reply({ content: R.notAuthorized, ...EPHEMERAL });
    return;
  }
  await interaction.showModal(buildFulfillModal(claimId));
}

export async function handleFulfillModal(
  interaction: ModalSubmitInteraction,
  claimId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const proofUrl = firstUploadedUrl(interaction, GiftClaimModalField.fulfillProof);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (!proofUrl) {
      throw new DomainError("GIFT_FULFILL_PROOF", R.fulfillProofRequired);
    }
    await giftClaimService.fulfillClaim({ claimId, manager: interaction.member, proofUrl });
    await interaction.editReply(R.fulfilledAck);
  } catch (err) {
    await replyError(interaction, err, "fulfill");
  }
}

async function replyError(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  err: unknown,
  where: string,
): Promise<void> {
  const content = err instanceof DomainError ? err.message : R.claimGone;
  if (!(err instanceof DomainError)) log.error(`${where} failed`, err);
  try {
    if (interaction.deferred || interaction.replied) await interaction.editReply(content);
    else await interaction.reply({ content, ...EPHEMERAL });
  } catch {
  }
}

function safeField(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}

function firstUploadedUrl(interaction: ModalSubmitInteraction, id: string): string {
  try {
    const files = interaction.fields.getUploadedFiles(id);
    return files?.first()?.url ?? "";
  } catch {
    return "";
  }
}
