import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { formatDuration } from "../services/duration.ts";
import { vacationService } from "../services/vacation.service.ts";
import { buildRefuseModal } from "../render/modals.ts";
import { VacModalField } from "./component-ids.ts";

const log = logger.child("vacation:decision-handler");
const R = vacationMessages.request;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

export async function handleApproveButton(
  interaction: ButtonInteraction,
  vacationId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await vacationService.approveApplication({ vacationId, manager: interaction.member });
    await interaction.editReply(R.approvedAck);
  } catch (err) {
    await replyError(interaction, err, "approve");
  }
}

export async function handleRefuseButton(
  interaction: ButtonInteraction,
  vacationId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!(await staffPermissionService.isStaffManager(interaction.member))) {
    await interaction.reply({ content: R.notAuthorized, ...EPHEMERAL });
    return;
  }
  await interaction.showModal(buildRefuseModal(vacationId));
}

export async function handleRefuseModal(
  interaction: ModalSubmitInteraction,
  vacationId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const reason = safeField(interaction, VacModalField.refuseReason);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await vacationService.rejectApplication({ vacationId, manager: interaction.member, reason });
    await interaction.editReply(R.rejectedAck);
  } catch (err) {
    await replyError(interaction, err, "refuse");
  }
}

export async function handleInfoButton(
  interaction: ButtonInteraction,
  vacationId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (!(await staffPermissionService.isStaffManager(interaction.member))) {
    await interaction.reply({ content: R.notAuthorized, ...EPHEMERAL });
    return;
  }
  const vacation = await vacationService.getByVacationId(vacationId);
  if (!vacation || vacation.guildId !== interaction.guildId) {
    await interaction.reply({ content: R.gone, ...EPHEMERAL });
    return;
  }
  const lines = [
    R.infoTitle,
    R.infoLine("عضو الستاف", `<@${vacation.staffId}> (\`${vacation.staffId}\`)`),
    R.infoLine(
      "المدة",
      formatDuration({ value: vacation.duration, unit: vacation.durationUnit }),
    ),
    R.infoLine("تاريخ الطلب", `<t:${Math.floor(vacation.requestedAt.getTime() / 1000)}:f>`),
    R.infoLine(
      "الفترة",
      `<t:${Math.floor(vacation.startsAt.getTime() / 1000)}:f> → <t:${Math.floor(
        vacation.endsAt.getTime() / 1000,
      )}:f>`,
    ),
    R.infoLine("الحالة", vacation.status),
    R.infoLine("السبب", vacation.reason),
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
