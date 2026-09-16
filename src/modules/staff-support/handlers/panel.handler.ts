import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { buildApplicationModal } from "../../vacation/render/modals.ts";
import { buildDemissionModal, buildSupportModal } from "../render/modals.ts";
import { staffSupportService } from "../services/staff-support.service.ts";
import { StaffSupportModalField } from "./component-ids.ts";

const log = logger.child("staff-support:panel");
const M = staffSupportMessages;
const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

/** Shared gate: all three workflows are for staff only. */
async function requireStaff(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.inCachedGuild()) return false;
  if (await staffPermissionService.canActAsStaff(interaction.member)) return true;
  await interaction.reply({ content: M.support.notStaff, ...EPHEMERAL });
  return false;
}

export async function handleSupportButton(interaction: ButtonInteraction): Promise<void> {
  if (!(await requireStaff(interaction))) return;
  await interaction.showModal(buildSupportModal());
}

export async function handleDemissionButton(interaction: ButtonInteraction): Promise<void> {
  if (!(await requireStaff(interaction))) return;
  await interaction.showModal(buildDemissionModal());
}

/**
 * Break Apply reuses the existing vacation application modal verbatim — its
 * submit id belongs to the vacation router, so the whole approval flow,
 * duration parsing, role snapshot and expiration stay exactly where they are.
 */
export async function handleBreakButton(interaction: ButtonInteraction): Promise<void> {
  if (!(await requireStaff(interaction))) return;
  await interaction.showModal(buildApplicationModal());
}

export async function handleSupportModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const reason = safeField(interaction, StaffSupportModalField.reason);
  await interaction.deferReply(EPHEMERAL);
  try {
    const result = await staffSupportService.createSupportTicket({
      guild: interaction.guild,
      member: interaction.member,
      reason,
    });
    await interaction.editReply(M.support.created(result.channelId));
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("staff support modal failed", err);
    await interaction.editReply(M.support.failed);
  }
}

export async function handleDemissionModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const reason = safeField(interaction, StaffSupportModalField.reason);
  await interaction.deferReply(EPHEMERAL);
  try {
    await staffSupportService.createDemissionRequest({
      guild: interaction.guild,
      member: interaction.member,
      reason,
    });
    await interaction.editReply(M.demission.submitted);
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("demission modal failed", err);
    await interaction.editReply(M.demission.failed);
  }
}

function safeField(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}
