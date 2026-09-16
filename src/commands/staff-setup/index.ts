import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { staffSupportMessages } from "../../data/staff-support/messages.ts";
import { DomainError } from "../../shared/utils/errors.ts";
import { logger } from "../../shared/utils/logger.ts";
import { staffSupportPanelService } from "../../modules/staff-support/services/staff-support-panel.service.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:staff-setup");
const M = staffSupportMessages.panel;

const data = new SlashCommandBuilder()
  .setName(CommandName.STAFF_SETUP)
  .setDescription(commandCopy.staffSetup.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

/** Thin: the panel itself is built and tracked by StaffSupportPanelService. */
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
      const result = await staffSupportPanelService.deploy(guild, channel);
      await interaction.editReply(
        result.created ? M.setupDeployed(result.channelId) : M.setupUpdated(result.channelId),
      );
    } catch (err) {
      if (err instanceof DomainError) {
        await interaction.editReply(err.message);
        return;
      }
      log.error("staff-setup failed", err);
      await interaction.editReply(commonMessages.errors.commandCrashed);
    }
  },
});
