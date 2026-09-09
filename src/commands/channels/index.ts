import {
  ChannelType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import {
  ChannelConfigType,
  channelConfigService,
} from "../../modules/configuration/index.ts";
import { CommandName, ChannelsSubcommand, CommandOption, commandCopy } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { configMessages } from "../../data/messages/config.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replyInfo, replySuccess } from "../_shared/responses.ts";
import { CHANNEL_CHOICES, renderChannelOverview } from "./overview.ts";

const CHANNEL_TYPE_SET = new Set<string>(CHANNEL_CHOICES.map((c) => c.value));

const data = new SlashCommandBuilder()
  .setName(CommandName.CHANNELS)
  .setDescription(commandCopy.channels.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(ChannelsSubcommand.SET)
      .setDescription(commandCopy.channels.sub.set.description)
      .addStringOption((o) =>
        o
          .setName(CommandOption.TYPE)
          .setDescription(commandCopy.channels.sub.set.options.type)
          .setRequired(true)
          .addChoices(...CHANNEL_CHOICES),
      )
      .addChannelOption((o) =>
        o
          .setName(CommandOption.CHANNEL)
          .setDescription(commandCopy.channels.sub.set.options.channel)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s.setName(ChannelsSubcommand.LIST).setDescription(commandCopy.channels.sub.list.description),
  );

async function handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const rawType = interaction.options.getString(CommandOption.TYPE, true);
  const channel = interaction.options.getChannel(CommandOption.CHANNEL, true);

  if (!CHANNEL_TYPE_SET.has(rawType)) {
    throw new CommandError(configMessages.channels.unknownType(rawType));
  }
  const type = rawType as ChannelConfigType;

  await channelConfigService.set({ guildId: guild.id, type, channelId: channel.id });
  await replySuccess(
    interaction,
    configMessages.channels.configured,
    configMessages.channels.slotLine(type),
    configMessages.channels.channelLine(channel.id),
  );
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const map = await channelConfigService.asMap(guild.id);
  await replyInfo(interaction, renderChannelOverview(map));
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case ChannelsSubcommand.SET:
        return handleSet(interaction);
      case ChannelsSubcommand.LIST:
        return handleList(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
});
