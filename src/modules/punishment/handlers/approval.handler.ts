import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { punishmentApprovalService } from "../services/punishment-approval.service.ts";
import { punishmentService } from "../services/punishment.service.ts";
import { canDecideApproval } from "../services/punishment-permissions.ts";
import { resolutionService } from "../services/resolution.service.ts";
import { buildRejectModal } from "../render/modals.ts";
import { PunModalField } from "./component-ids.ts";

const log = logger.child("punishment:approval-handler");
const A = punishmentMessages.approval;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleApproveButton(
  interaction: ButtonInteraction,
  approvalId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const { approval, punishment } = await punishmentApprovalService.decide(
      approvalId,
      interaction.member,
      "APPROVE",
    );

    await interaction.editReply(A.approvedAck(punishment.type));

    const result = await resolutionService.executeApproved(
      punishment.punishmentId,
      interaction.user.id,
    );

    const refreshed = await punishmentService.getPunishment(punishment.punishmentId);
    await punishmentApprovalService.refreshCard(
      approval,
      refreshed ?? punishment,
      result.executed ? A.statusExecuted : A.statusFailed,
    );

    if (!result.executed) {
      await interaction.followUp({
        content: `${A.statusFailed}${result.failureReason ? `\n${result.failureReason}` : ""}`,
        ...EPHEMERAL,
      });
    }
  } catch (err) {
    await replyError(interaction, err, "approve");
  }
}

export async function handleRejectButton(
  interaction: ButtonInteraction,
  approvalId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.showModal(buildRejectModal(approvalId));
}

export async function handleRejectModal(
  interaction: ModalSubmitInteraction,
  approvalId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const reason = safeField(interaction, PunModalField.rejectReason);
  try {
    const { approval, punishment } = await punishmentApprovalService.decide(
      approvalId,
      interaction.member,
      "REJECT",
      reason || undefined,
    );
    await punishmentApprovalService.refreshCard(approval, punishment);
    await interaction.editReply(A.rejectedAck);
  } catch (err) {
    await replyError(interaction, err, "reject");
  }
}

export async function handleInfoButton(
  interaction: ButtonInteraction,
  approvalId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const approval = await punishmentApprovalService.getByApprovalId(approvalId);
  if (!approval || approval.guildId !== interaction.guildId) {
    await interaction.reply({ content: A.gone, ...EPHEMERAL });
    return;
  }
  if (!(await canDecideApproval(interaction.member, approval.type))) {
    await interaction.reply({
      content: approval.type === "BAN" ? A.notAuthorizedBan : A.notAuthorizedKick,
      ...EPHEMERAL,
    });
    return;
  }

  const punishment = await punishmentService.getPunishment(approval.punishmentId);
  if (!punishment) {
    await interaction.reply({ content: A.gone, ...EPHEMERAL });
    return;
  }

  const lines = [
    A.infoTitle(punishment.type),
    A.infoLine("الهدف", `<@${punishment.userId}> (\`${punishment.userId}\`)`),
    A.infoLine("مقدّم الطلب", `<@${approval.requestedBy}>`),
    A.infoLine("السبب", punishment.reason),
    ...(punishment.reportId ? [A.infoLine("البلاغ", `\`${punishment.reportId}\``)] : []),
    punishment.evidence.length
      ? A.infoLine("الأدلة", `\n${punishment.evidence.join("\n")}`)
      : A.infoLine("الأدلة", "ما فيه شي مرفق"),
  ];
  await interaction.reply({ content: lines.join("\n"), ...EPHEMERAL });
}

async function replyError(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  err: unknown,
  where: string,
): Promise<void> {
  const content = err instanceof DomainError ? err.message : A.gone;
  if (!(err instanceof DomainError)) log.error(`${where} failed`, err);
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({ content, ...EPHEMERAL });
    }
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
