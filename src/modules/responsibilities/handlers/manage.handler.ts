import { MessageFlags, type ButtonInteraction, type ModalSubmitInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { buildGiveModal, buildTakeModal } from "../render/manage.ts";
import { responsibilityAssignmentService } from "../services/responsibility-assignment.service.ts";
import { responsibilityAuthorizationService } from "../services/responsibility-authorization.service.ts";
import { ResponsibilityField } from "./component-ids.ts";

const M = responsibilityMessages;
const EPHEMERAL = MessageFlags.Ephemeral;

function picked(interaction: ModalSubmitInteraction, id: string): string[] {
  try {
    return [...interaction.fields.getStringSelectValues(id)];
  } catch {
    return [];
  }
}

async function requireManager(interaction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">): Promise<boolean> {
  if (await responsibilityAuthorizationService.canManageAny(interaction.member)) return true;
  await interaction.reply({ content: M.errors.notAllowedAny, flags: EPHEMERAL });
  return false;
}

async function targetExists(interaction: ButtonInteraction<"cached">, targetId: string): Promise<boolean> {
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (target) return true;
  await interaction.reply({ content: M.errors.targetGone, flags: EPHEMERAL });
  return false;
}

export async function handleGiveButton(interaction: ButtonInteraction<"cached">, executorId: string, targetId: string): Promise<void> {
  if (!(await requireManager(interaction)) || !(await targetExists(interaction, targetId))) return;
  const assignable = await responsibilityAssignmentService.assignableFor(interaction.guild, interaction.member, targetId);
  if (assignable.length === 0) {
    await interaction.reply({ content: M.assign.nothingToAssign, flags: EPHEMERAL });
    return;
  }
  await interaction.showModal(buildGiveModal(executorId, targetId, assignable));
}

export async function handleTakeButton(interaction: ButtonInteraction<"cached">, executorId: string, targetId: string): Promise<void> {
  if (!(await requireManager(interaction)) || !(await targetExists(interaction, targetId))) return;
  const active = await responsibilityAssignmentService.getActiveResponsibilities(interaction.guildId, targetId);
  if (active.length === 0) {
    await interaction.reply({ content: M.remove.none, flags: EPHEMERAL });
    return;
  }
  const removable = await responsibilityAssignmentService.removableFor(interaction.guild, interaction.member, targetId);
  if (removable.length === 0) {
    await interaction.reply({ content: M.remove.nothingYouCanRemove, flags: EPHEMERAL });
    return;
  }
  await interaction.showModal(
    buildTakeModal(
      executorId,
      targetId,
      removable.map((row) => ({ assignmentId: row.assignment.assignmentId, responsibility: row.responsibility })),
    ),
  );
}

async function runEach(ids: readonly string[], run: (id: string) => Promise<string>): Promise<string[]> {
  const lines: string[] = [];
  for (const id of ids) {
    try {
      lines.push(await run(id));
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      lines.push(err.message);
    }
  }
  return lines;
}

export async function handleGiveModal(interaction: ModalSubmitInteraction<"cached">, targetId: string): Promise<void> {
  if (!(await requireManager(interaction))) return;
  const ids = picked(interaction, ResponsibilityField.pick);
  if (ids.length === 0) {
    await interaction.reply({ content: M.manage.nothingPicked, flags: EPHEMERAL });
    return;
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  const lines = await runEach(ids, async (responsibilityId) => {
    const { assignment, responsibility } = await responsibilityAssignmentService.assignResponsibility({
      guild: interaction.guild,
      executor: interaction.member,
      targetId,
      responsibilityId,
    });
    return M.assign.done(responsibility.title, targetId, assignment.expiresAt ?? null);
  });
  await interaction.editReply({ content: lines.join("\n").slice(0, 2000), allowedMentions: { parse: [] } });
}

export async function handleTakeModal(interaction: ModalSubmitInteraction<"cached">, targetId: string): Promise<void> {
  if (!(await requireManager(interaction))) return;
  const ids = picked(interaction, ResponsibilityField.pick);
  if (ids.length === 0) {
    await interaction.reply({ content: M.manage.nothingPicked, flags: EPHEMERAL });
    return;
  }
  await interaction.deferReply({ flags: EPHEMERAL });
  const lines = await runEach(ids, async (assignmentId) => {
    const { responsibility } = await responsibilityAssignmentService.removeResponsibility({
      guild: interaction.guild,
      executor: interaction.member,
      assignmentId,
      targetId,
    });
    return M.remove.done(responsibility.title, targetId);
  });
  await interaction.editReply({ content: lines.join("\n").slice(0, 2000), allowedMentions: { parse: [] } });
}
