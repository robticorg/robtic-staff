import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { vacationMessages } from "../../data/vacation/messages.ts";
import { DomainError } from "../../shared/utils/errors.ts";
import { logger } from "../../shared/utils/logger.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { vacationPanelService } from "../../modules/vacation/services/vacation-panel.service.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:vacation-setup");
const M = vacationMessages.panel;

const data = new SlashCommandBuilder()
  .setName(CommandName.VACATION_SETUP)
  .setDescription(commandCopy.vacationSetup.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    requireAdministrator(interaction);

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      await interaction.reply({ content: M.setupChannelInvalid, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await vacationPanelService.deploy(guild, channel);
      await interaction.editReply(
        result.created ? M.setupDeployed(result.channelId) : M.setupUpdated(result.channelId),
      );
    } catch (err) {
      if (err instanceof DomainError) {
        await interaction.editReply(err.message);
        return;
      }
      log.error("vacation-setup failed", err);
      await interaction.editReply(commonMessages.errors.commandCrashed);
    }
  },
});
