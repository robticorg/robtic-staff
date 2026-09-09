import {
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { modmailCaseService } from "../../modmail/services/modmail-case.service.ts";
import { reportPermissionService } from "../../modmail/services/report-permissions.service.ts";
import { parseDuration } from "../services/duration.service.ts";
import { resolutionService } from "../services/resolution.service.ts";
import { PunishmentType, type PunishmentType as PType } from "../types/enums.ts";
import { buildReasonModal } from "../render/modals.ts";
import { PunModalField } from "./component-ids.ts";

const log = logger.child("punishment:resolution-handler");
const M = punishmentMessages.resolution;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

const VALID_TYPES = new Set<string>(Object.values(PunishmentType));

export async function handleResolutionSelect(
  interaction: StringSelectMenuInteraction,
  caseId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const kase = await modmailCaseService.getByCaseId(caseId);
  if (!kase || kase.guildId !== interaction.guildId) {
    await interaction.reply({ content: M.expired, ...EPHEMERAL });
    return;
  }
  if (!(await reportPermissionService.canManageReport(interaction.member, kase))) {
    await interaction.reply({ content: M.notAllowed, ...EPHEMERAL });
    return;
  }

  const value = interaction.values[0];
  if (!value || !VALID_TYPES.has(value)) {
    await interaction.reply({ content: M.expired, ...EPHEMERAL });
    return;
  }

  await interaction.showModal(buildReasonModal(caseId, value as PType));
}

export async function handleResolutionModal(
  interaction: ModalSubmitInteraction,
  caseId: string,
  rawType: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!VALID_TYPES.has(rawType)) return;
  const type = rawType as PType;

  const kase = await modmailCaseService.getByCaseId(caseId);
  if (!kase || kase.guildId !== interaction.guildId) {
    await interaction.reply({ content: M.expired, ...EPHEMERAL });
    return;
  }
  if (!(await reportPermissionService.canManageReport(interaction.member, kase))) {
    await interaction.reply({ content: M.notAllowed, ...EPHEMERAL });
    return;
  }

  const reason = safeField(interaction, PunModalField.reason);
  if (type !== PunishmentType.NO_ACTION && !reason) {
    await interaction.reply({ content: M.reasonRequired, ...EPHEMERAL });
    return;
  }

  let durationMs: number | undefined;
  if (type === PunishmentType.TIMEOUT) {
    const picked = safeSelect(interaction, PunModalField.duration);
    const parsed = picked ? parseDuration(picked) : null;
    if (!parsed) {
      await interaction.reply({ content: M.durationRequired, ...EPHEMERAL });
      return;
    }
    durationMs = parsed;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const result = await resolutionService.resolve({
      caseId,
      member: interaction.member,
      type,
      reason: reason || M.options[type].label,
      durationMs,
    });

    if (result.pendingApproval && result.approvalChannelId) {
      await interaction.editReply(M.pendingApproval(type, result.approvalChannelId));
    } else if (result.executed) {
      await interaction.editReply(M.executed(type));
    } else {
      await interaction.editReply(
        `${M.executeFailed(type)}${result.failureReason ? `\n${result.failureReason}` : ""}`,
      );
    }

    await interaction.message
      ?.edit({ components: [] })
      .catch(() => undefined);
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("resolution modal failed", err);
    await interaction.editReply(punishmentMessages.approval.gone);
  }
}

function safeField(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}

function safeSelect(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getStringSelectValues(id)[0] ?? null;
  } catch {
    return null;
  }
}
