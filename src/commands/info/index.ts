import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type SlashCommandStringOption,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, InfoSubcommand } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { staffInfoMessages } from "../../data/staff-info/messages.ts";
import { logger } from "../../shared/utils/logger.ts";
import { buildInfoAddModal, buildInfoPageModal } from "../../modules/staff-info/render/modals.ts";
import { buildInfoPage } from "../../modules/staff-info/render/viewer.ts";
import { staffInfoPanelService } from "../../modules/staff-info/services/staff-info-panel.service.ts";
import { staffInfoService } from "../../modules/staff-info/services/staff-info.service.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:info");
const M = staffInfoMessages.command;

const infoOption = (required: boolean) => (o: SlashCommandStringOption) =>
  o
    .setName(CommandOption.INFO)
    .setDescription(M.infoOption)
    .setRequired(required)
    .setAutocomplete(true);

const data = new SlashCommandBuilder()
  .setName(CommandName.INFO)
  .setDescription(M.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) => s.setName(InfoSubcommand.SETUP).setDescription(M.setup))
  .addSubcommand((s) => s.setName(InfoSubcommand.ADD).setDescription(M.add))
  .addSubcommand((s) =>
    s.setName(InfoSubcommand.REMOVE).setDescription(M.remove).addStringOption(infoOption(true)),
  )
  .addSubcommand((s) =>
    s.setName(InfoSubcommand.SEE).setDescription(M.see).addStringOption(infoOption(false)),
  )
  .addSubcommandGroup((g) =>
    g
      .setName(InfoSubcommand.PAGE_GROUP)
      .setDescription(M.pageGroup)
      .addSubcommand((s) =>
        s.setName(InfoSubcommand.PAGE_ADD).setDescription(M.pageAdd).addStringOption(infoOption(true)),
      ),
  );

async function requireInfo(interaction: ChatInputCommandInteraction, guildId: string) {
  const infoId = interaction.options.getString(CommandOption.INFO, true);
  const info = await staffInfoService.get(guildId, infoId);
  if (!info) throw new CommandError(M.notFound);
  return info;
}

async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    throw new CommandError(M.setupChannelInvalid);
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { created } = await staffInfoPanelService.deploy(guild, channel);
  await interaction.editReply(created ? M.setupDone(channel.id) : M.setupUpdated(channel.id));
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const info = await requireInfo(interaction, guild.id);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const removed = await staffInfoService.remove(guild.id, info.infoId);
  await staffInfoPanelService.refresh(guild);
  await interaction.editReply(M.removed(removed.name));
}

async function handleSee(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);

  // With an info: preview it exactly as a member sees it.
  if (interaction.options.getString(CommandOption.INFO)) {
    const info = await requireInfo(interaction, guild.id);
    const page = buildInfoPage(info, 1);
    await interaction.reply({ ...page, flags: page.flags | MessageFlags.Ephemeral });
    return;
  }

  const infos = await staffInfoService.list(guild.id);
  const body = infos.length
    ? [M.listTitle, "", ...infos.map((i, n) => M.listRow(n + 1, i.name, i.description, i.pages.length))].join(
        "\n",
      )
    : M.listEmpty;
  await interaction.reply({ content: body, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === InfoSubcommand.PAGE_GROUP && sub === InfoSubcommand.PAGE_ADD) {
      const info = await requireInfo(interaction, interaction.guildId!);
      await interaction.showModal(buildInfoPageModal(info.infoId));
      return;
    }

    switch (sub) {
      case InfoSubcommand.SETUP:
        return handleSetup(interaction);
      case InfoSubcommand.ADD:
        await interaction.showModal(buildInfoAddModal());
        return;
      case InfoSubcommand.REMOVE:
        return handleRemove(interaction);
      case InfoSubcommand.SEE:
        return handleSee(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
  async autocomplete(interaction) {
    try {
      if (!interaction.inGuild()) return void (await interaction.respond([]));
      const matches = await staffInfoService.search(
        interaction.guildId,
        String(interaction.options.getFocused()),
      );
      await interaction.respond(
        matches.map((i) => ({
          name: `${i.name} (${i.pages.length})`.slice(0, 100),
          value: i.infoId,
        })),
      );
    } catch (err) {
      log.warn("info autocomplete failed", err);
      await interaction.respond([]).catch(() => undefined);
    }
  },
});
