import { ChannelType, MessageFlags, type GuildTextBasedChannel, type Interaction, type ModalSubmitInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { commonMessages } from "../../../data/messages/common.ts";
import { panelCreatesChannel } from "../../../data/tickets/index.ts";
import { TicketPanelKind, ticketSetupCommandMessages } from "../../../data/tickets/setup-command.ts";
import { hasAdminAccess } from "../../access/index.ts";
import { staffSupportPanelService } from "../../staff-support/services/staff-support-panel.service.ts";
import { responsibilityApplyPanelService } from "../responsibility-apply/panel.service.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { ticketPanelSettingsService } from "../services/ticket-panel-settings.service.ts";
import { ticketSetupService } from "../services/ticket-setup.service.ts";
import { PanelConfigField, parsePanelConfigCustomId } from "./component-ids.ts";

const log = logger.child("tickets:panel-config");
const M = ticketSetupCommandMessages;
const EPHEMERAL = MessageFlags.Ephemeral;

function selectedString(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getStringSelectValues(id)[0] ?? null;
  } catch {
    return null;
  }
}

function selectedRole(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getSelectedRoles(id)?.first()?.id ?? null;
  } catch {
    return null;
  }
}

function selectedChannel(interaction: ModalSubmitInteraction, id: string): string | null {
  try {
    return interaction.fields.getSelectedChannels(id)?.first()?.id ?? null;
  } catch {
    return null;
  }
}

function text(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}

async function handleSetup(interaction: ModalSubmitInteraction<"cached">): Promise<void> {
  const panelId = selectedString(interaction, PanelConfigField.type);
  const panel = panelId ? ticketConfigService.getPanel(panelId) : undefined;
  if (!panel) throw new DomainError("TCFG_TYPE", M.errors.typeRequired);
  const supportRoleId = selectedRole(interaction, PanelConfigField.support);
  if (!supportRoleId) throw new DomainError("TCFG_SUPPORT", M.errors.supportRequired);
  const managerRoleId = selectedRole(interaction, PanelConfigField.manager);
  if (supportRoleId === interaction.guildId || managerRoleId === interaction.guildId) {
    throw new DomainError("TCFG_EVERYONE", M.errors.everyone);
  }
  const categoryId = selectedChannel(interaction, PanelConfigField.category);
  if (panelCreatesChannel(panel) && !categoryId) throw new DomainError("TCFG_CATEGORY", M.errors.categoryRequired);
  if (categoryId) {
    const category = await interaction.guild.channels.fetch(categoryId).catch(() => null);
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new DomainError("TCFG_CATEGORY", M.errors.categoryRequired);
    }
  }

  await ticketPanelSettingsService.save({
    guildId: interaction.guildId,
    panelId: panel.id,
    supportRoleId,
    managerRoleId,
    categoryId: categoryId ?? null,
    actorId: interaction.user.id,
  });
  await interaction.reply({
    content: M.setupDone(panel.name, supportRoleId, managerRoleId, categoryId),
    flags: EPHEMERAL,
    allowedMentions: { parse: [] },
  });
}

async function handleSend(interaction: ModalSubmitInteraction<"cached">): Promise<void> {
  const kind = selectedString(interaction, PanelConfigField.panel);
  if (!kind) throw new DomainError("TCFG_PANEL", M.errors.panelRequired);
  const channelId = selectedChannel(interaction, PanelConfigField.channel);
  const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
    throw new DomainError("TCFG_CHANNEL", M.errors.channelRequired);
  }
  const image = text(interaction, PanelConfigField.image);
  if (image && !/^https:\/\/\S+$/i.test(image)) throw new DomainError("TCFG_IMAGE", M.errors.imageInvalid);

  await interaction.deferReply({ flags: EPHEMERAL });
  const target = channel as GuildTextBasedChannel;
  let result: { channelId: string; created: boolean };
  if (kind === TicketPanelKind.MAIN) result = await ticketSetupService.deploy(interaction.guild, channel);
  else if (kind === TicketPanelKind.STAFF) result = await staffSupportPanelService.deploy(interaction.guild, target);
  else if (kind === TicketPanelKind.RESPONSIBILITY) {
    result = await responsibilityApplyPanelService.deploy(interaction.guild, target, {
      title: text(interaction, PanelConfigField.title),
      description: text(interaction, PanelConfigField.description),
      image,
    });
  } else throw new DomainError("TCFG_PANEL", M.errors.panelRequired);

  await interaction.editReply(M.sent(M.kinds[kind] ?? kind, result.channelId, result.created));
}

export async function routePanelConfigComponent(interaction: Interaction): Promise<boolean> {
  if (!interaction.isModalSubmit()) return false;
  const action = parsePanelConfigCustomId(interaction.customId);
  if (!action) return false;
  if (!interaction.inCachedGuild()) return true;

  try {
    if (!hasAdminAccess({ id: interaction.user.id, permissions: interaction.memberPermissions })) {
      await interaction.reply({ content: M.errors.adminOnly, flags: EPHEMERAL });
      return true;
    }
    if (action === "setup") await handleSetup(interaction);
    else if (action === "send") await handleSend(interaction);
    else return false;
  } catch (err) {
    const content = err instanceof DomainError ? err.message : commonMessages.errors.componentCrashed;
    if (!(err instanceof DomainError)) log.error(`ticket panel config "${action}" failed`, err);
    if (interaction.deferred || interaction.replied) await interaction.editReply(content).catch(() => undefined);
    else await interaction.reply({ content, flags: EPHEMERAL }).catch(() => undefined);
  }
  return true;
}
