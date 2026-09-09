import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { appealMessages } from "../../../data/appeals/messages.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { modmailCaseService } from "../../modmail/services/modmail-case.service.ts";
import { punishmentService } from "../../punishment/services/punishment.service.ts";
import { appealPermissionService } from "../services/appeal-permissions.service.ts";
import { appealService } from "../services/appeal.service.ts";
import { buildDecisionModal } from "../render/modals.ts";
import { AplModalField } from "./component-ids.ts";

const log = logger.child("appeal:review-handler");
const R = appealMessages.review;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleClaim(
  interaction: ButtonInteraction,
  appealId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await appealService.claimAppeal(appealId, interaction.member);
    await interaction.editReply(R.claimedAck);
  } catch (err) {
    await replyError(interaction, err, "claim");
  }
}

export async function handleAcceptButton(
  interaction: ButtonInteraction,
  appealId: string,
): Promise<void> {
  await openDecisionModal(interaction, appealId, "accept");
}

export async function handleRejectButton(
  interaction: ButtonInteraction,
  appealId: string,
): Promise<void> {
  await openDecisionModal(interaction, appealId, "reject");
}

async function openDecisionModal(
  interaction: ButtonInteraction,
  appealId: string,
  decision: "accept" | "reject",
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!(await appealPermissionService.canReview(interaction.member))) {
    await interaction.reply({ content: R.notAuthorized, ...EPHEMERAL });
    return;
  }
  await interaction.showModal(buildDecisionModal(appealId, decision));
}

export async function handleDecisionModal(
  interaction: ModalSubmitInteraction,
  appealId: string,
  decision: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const decisionReason = safeField(interaction, AplModalField.decisionReason);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    if (decision === "accept") {
      const result = await appealService.acceptAppeal({
        appealId,
        reviewer: interaction.member,
        decisionReason,
      });
      await interaction.editReply(result.reversalPartial ? R.acceptedAckPartial : R.acceptedAck);
    } else {
      await appealService.rejectAppeal({
        appealId,
        reviewer: interaction.member,
        decisionReason,
      });
      await interaction.editReply(R.rejectedAck);
    }
  } catch (err) {
    await replyError(interaction, err, `decide:${decision}`);
  }
}

export async function handleInfo(
  interaction: ButtonInteraction,
  appealId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!(await appealPermissionService.canReview(interaction.member))) {
    await interaction.reply({ content: R.notAuthorized, ...EPHEMERAL });
    return;
  }
  const appeal = await appealService.getAppeal(appealId);
  if (!appeal || appeal.guildId !== interaction.guildId) {
    await interaction.reply({ content: R.gone, ...EPHEMERAL });
    return;
  }
  const punishment = await punishmentService.getPunishment(appeal.punishmentId);
  if (!punishment) {
    await interaction.reply({ content: R.punishmentGone, ...EPHEMERAL });
    return;
  }

  let investigator = "—";
  if (punishment.reportId) {
    const kase = await modmailCaseService.getByCaseId(punishment.reportId).catch(() => null);
    if (kase?.claimedByDiscordId) investigator = `<@${kase.claimedByDiscordId}>`;
  }
  const label = punishmentMessages.labels[punishment.type] ?? punishment.type;
  const lines = [
    R.infoTitle,
    R.infoLine("العضو", `<@${appeal.userId}> (\`${appeal.userId}\`)`),
    R.infoLine("آيدي العقوبة", `\`${punishment.punishmentId}\``),
    R.infoLine("نوع العقوبة", label),
    R.infoLine(
      "تاريخ العقوبة",
      punishment.executedAt
        ? `<t:${Math.floor(punishment.executedAt.getTime() / 1000)}:f>`
        : "—",
    ),
    R.infoLine("مُصدِر العقوبة", `<@${punishment.issuedBy}>`),
    R.infoLine("آيدي البلاغ", punishment.reportId ? `\`${punishment.reportId}\`` : "—"),
    R.infoLine("المحقق", investigator),
    R.infoLine("حالة الاستئناف", appeal.status),
    R.infoLine("تاريخ التقديم", `<t:${Math.floor(appeal.submittedAt.getTime() / 1000)}:f>`),
  ];
  await interaction.reply({ content: lines.join("\n"), ...EPHEMERAL });
}

async function replyError(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  err: unknown,
  where: string,
): Promise<void> {
  const content = err instanceof DomainError ? err.message : R.gone;
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
