import {
  MessageFlags,
  PermissionFlagsBits,
  type Interaction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import {
  RESPONSIBILITY_CATEGORY_LABELS,
  RESPONSIBILITY_PERMISSION_LABELS,
} from "../../../data/responsibilities/config.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { formatDuration } from "../../punishment/services/duration.service.ts";
import { buildCategoryMenu, buildMenuResult } from "../render/menus.ts";
import { responsibilityAssignmentService } from "../services/responsibility-assignment.service.ts";
import { responsibilityService } from "../services/responsibility.service.ts";
import { ResponsibilityError } from "../shared/responsibility-error.ts";
import type { ResponsibilityCategory } from "../types/enums.ts";
import { parseResponsibilityDuration } from "../shared/duration.ts";
import { ResponsibilityField, parseResponsibilityCustomId } from "./component-ids.ts";

const log = logger.child("responsibilities:components");
const EPHEMERAL = MessageFlags.Ephemeral;
const E = responsibilityMessages.errors;

function text(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id);
  } catch {
    return "";
  }
}

function firstSelected(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getStringSelectValues(id)[0] ?? null;
  } catch {
    return null;
  }
}

function selectedRoleId(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getSelectedRoles(id)?.first()?.id ?? null;
  } catch {
    return null;
  }
}

async function handleAddModal(interaction: ModalSubmitInteraction<"cached">): Promise<void> {
  const durationRaw = text(interaction, ResponsibilityField.duration).trim();
  const durationMs = durationRaw ? parseResponsibilityDuration(durationRaw) : null;
  if (durationRaw && durationMs === null) {
    throw new ResponsibilityError("RESP_DURATION", responsibilityMessages.create.durationInvalid);
  }
  const created = await responsibilityService.createResponsibility({
    guild: interaction.guild,
    roleId: selectedRoleId(interaction, ResponsibilityField.role),
    permission: firstSelected(interaction, ResponsibilityField.permission),
    title: text(interaction, ResponsibilityField.title),
    description: text(interaction, ResponsibilityField.description),
    durationMs,
    createdBy: interaction.user.id,
  });
  await interaction.reply({
    ...buildCategoryMenu(
      created.responsibilityId,
      responsibilityMessages.create.created(
        created.title,
        created.roleId,
        RESPONSIBILITY_PERMISSION_LABELS[created.permission] ?? created.permission,
        created.defaultDuration ? formatDuration(created.defaultDuration) : null,
      ),
    ),
    flags: EPHEMERAL,
  });
}

async function handleCategory(
  interaction: StringSelectMenuInteraction<"cached">,
  responsibilityId: string,
): Promise<void> {
  const category = interaction.values[0] as ResponsibilityCategory;
  const updated = await responsibilityService.updateResponsibility(interaction.guildId, responsibilityId, {
    category,
  });
  await interaction.update({
    content: responsibilityMessages.create.categorySet(
      updated.title,
      RESPONSIBILITY_CATEGORY_LABELS[updated.category] ?? updated.category,
    ),
    components: [],
  });
}

async function handleAssign(
  interaction: StringSelectMenuInteraction<"cached">,
  targetId: string,
): Promise<void> {
  const { assignment, responsibility } = await responsibilityAssignmentService.assignResponsibility({
    guild: interaction.guild,
    executor: interaction.member,
    targetId,
    responsibilityId: interaction.values[0] ?? "",
  });
  await interaction.reply({
    content: responsibilityMessages.assign.done(responsibility.title, targetId, assignment.expiresAt ?? null),
    flags: EPHEMERAL,
    allowedMentions: { parse: [] },
  });
  await interaction.message
    .edit(buildMenuResult(responsibilityMessages.assign.menuDone(responsibility.title, targetId)))
    .catch(() => undefined);
}

async function handleRemove(
  interaction: StringSelectMenuInteraction<"cached">,
  targetId: string,
): Promise<void> {
  const { responsibility } = await responsibilityAssignmentService.removeResponsibility({
    guild: interaction.guild,
    executor: interaction.member,
    assignmentId: interaction.values[0] ?? "",
    targetId,
  });
  await interaction.reply({
    content: responsibilityMessages.remove.done(responsibility.title, targetId),
    flags: EPHEMERAL,
    allowedMentions: { parse: [] },
  });
  await interaction.message
    .edit(buildMenuResult(responsibilityMessages.remove.menuDone(responsibility.title, targetId)))
    .catch(() => undefined);
}

export async function routeResponsibilityComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return false;
  const parsed = parseResponsibilityCustomId(interaction.customId);
  if (!parsed || !interaction.inCachedGuild()) return false;

  try {
    if (parsed.action === "add" || parsed.action === "cat") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: E.adminOnly, flags: EPHEMERAL });
        return true;
      }
      if (parsed.action === "add" && interaction.isModalSubmit()) await handleAddModal(interaction);
      else if (parsed.action === "cat" && interaction.isStringSelectMenu()) {
        await handleCategory(interaction, parsed.args[0] ?? "");
      } else return false;
      return true;
    }

    if (!interaction.isStringSelectMenu()) return false;
    const [executorId, targetId] = parsed.args;
    if (!executorId || !targetId) return false;
    if (interaction.user.id !== executorId) {
      await interaction.reply({ content: E.notYours, flags: EPHEMERAL });
      return true;
    }
    if (parsed.action === "assign") await handleAssign(interaction, targetId);
    else if (parsed.action === "remove") await handleRemove(interaction, targetId);
    else return false;
  } catch (err) {
    const content = err instanceof DomainError ? err.message : commonMessages.errors.componentCrashed;
    if (!(err instanceof DomainError)) log.error(`component "${interaction.customId}" failed`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, flags: EPHEMERAL }).catch(() => undefined);
    } else {
      await interaction.reply({ content, flags: EPHEMERAL }).catch(() => undefined);
    }
  }
  return true;
}
