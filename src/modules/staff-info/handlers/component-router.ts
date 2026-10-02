import {
  MessageFlags,
  type ButtonInteraction,
  type Interaction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { staffInfoMessages } from "../../../data/staff-info/messages.ts";
import { replyEphemeralError } from "../../../libs/discord/index.ts";
import { buildInfoPage } from "../render/viewer.ts";
import { staffInfoPanelService } from "../services/staff-info-panel.service.ts";
import { staffInfoService } from "../services/staff-info.service.ts";
import { canOpenInfo } from "../services/staff-info-access.ts";
import { StaffInfoField, parseStaffInfoCustomId } from "./component-ids.ts";
import { hasAdminAccess } from "../../access/index.ts";

const log = logger.child("staff-info:components");
const C = staffInfoMessages.command;
const EPHEMERAL = MessageFlags.Ephemeral;

function field(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id);
  } catch {
    return "";
  }
}

async function handleSelect(interaction: StringSelectMenuInteraction<"cached">): Promise<void> {
  const info = await staffInfoService.get(interaction.guildId, interaction.values[0] ?? "");
  if (!info) {
    await interaction.reply({ content: staffInfoMessages.viewer.gone, flags: EPHEMERAL });
  } else if (!canOpenInfo(interaction.member, info)) {
    await interaction.reply({
      content: staffInfoMessages.viewer.noAccess(info.accessRoleId!),
      flags: EPHEMERAL,
      allowedMentions: { parse: [] },
    });
  } else {
    const page = buildInfoPage(info, 1);
    await interaction.reply({ ...page, flags: page.flags | EPHEMERAL });
  }
  // Re-render the panel so the menu clears — otherwise picking the same info again does nothing.
  await interaction.message
    .edit(await staffInfoPanelService.payload(interaction.guildId))
    .catch((err) => log.warn("staff info menu reset failed", err));
}

async function handlePage(
  interaction: ButtonInteraction<"cached">,
  infoId: string,
  page: number,
): Promise<void> {
  const info = await staffInfoService.get(interaction.guildId, infoId);
  if (!info) {
    await interaction.reply({ content: staffInfoMessages.viewer.gone, flags: EPHEMERAL });
    return;
  }
  // Checked again per page: the role may have been set (or taken away) after they opened it.
  if (!canOpenInfo(interaction.member, info)) {
    await interaction.reply({
      content: staffInfoMessages.viewer.noAccess(info.accessRoleId!),
      flags: EPHEMERAL,
      allowedMentions: { parse: [] },
    });
    return;
  }
  await interaction.update(buildInfoPage(info, page));
}

async function handleAddModal(interaction: ModalSubmitInteraction<"cached">): Promise<void> {
  await interaction.deferReply({ flags: EPHEMERAL });
  const info = await staffInfoService.add({
    guildId: interaction.guildId,
    name: field(interaction, StaffInfoField.name),
    description: field(interaction, StaffInfoField.description),
    content: field(interaction, StaffInfoField.content),
    createdBy: interaction.user.id,
  });
  const panelUpdated = await staffInfoPanelService.refresh(interaction.guild);
  await interaction.editReply(C.added(info.name, panelUpdated));
}

async function handlePageModal(
  interaction: ModalSubmitInteraction<"cached">,
  infoId: string,
): Promise<void> {
  await interaction.deferReply({ flags: EPHEMERAL });
  const info = await staffInfoService.addPage(
    interaction.guildId,
    infoId,
    field(interaction, StaffInfoField.content),
  );
  await interaction.editReply(C.pageAdded(info.name, info.pages.length));
}

async function handleEditModal(
  interaction: ModalSubmitInteraction<"cached">,
  infoId: string,
  page: number,
): Promise<void> {
  await interaction.deferReply({ flags: EPHEMERAL });
  const info = await staffInfoService.editPage(
    interaction.guildId,
    infoId,
    page,
    field(interaction, StaffInfoField.content),
  );
  await interaction.editReply(C.pageEdited(info.name, page));
}

export async function routeStaffInfoComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) {
    return false;
  }
  const parsed = parseStaffInfoCustomId(interaction.customId);
  if (!parsed || !interaction.inCachedGuild()) return false;

  try {
    if (interaction.isStringSelectMenu() && parsed.action === "select") {
      await handleSelect(interaction);
    } else if (interaction.isButton() && parsed.action === "page") {
      await handlePage(interaction, parsed.args[0] ?? "", Number(parsed.args[1]) || 1);
    } else if (interaction.isModalSubmit()) {
      // The forms come from admin-only /info commands; check again on submit.
      if (!hasAdminAccess({ id: interaction.user.id, permissions: interaction.memberPermissions })) {
        await replyEphemeralError(interaction, commonMessages.errors.needAdministrator);
      } else if (parsed.action === "addModal") {
        await handleAddModal(interaction);
      } else if (parsed.action === "pageModal") {
        await handlePageModal(interaction, parsed.args[0] ?? "");
      } else if (parsed.action === "editModal") {
        await handleEditModal(interaction, parsed.args[0] ?? "", Number(parsed.args[1]));
      } else {
        return false;
      }
    } else {
      return false;
    }
  } catch (err) {
    if (err instanceof DomainError) {
      const content = err.message;
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content }).catch(() => undefined);
      } else {
        await interaction.reply({ content, flags: EPHEMERAL }).catch(() => undefined);
      }
      return true;
    }
    log.error(`component "${interaction.customId}" failed`, err);
    await replyEphemeralError(interaction, commonMessages.errors.componentCrashed);
  }
  return true;
}
