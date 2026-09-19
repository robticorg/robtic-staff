import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { warnPanelMessages } from "../../data/warn-panel/messages.ts";
import { DomainError } from "../../shared/utils/errors.ts";
import { logger } from "../../shared/utils/logger.ts";
import { warningPanelService } from "../../modules/warning-panel/services/warning-panel.service.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:warn-setup");
const M = warnPanelMessages.setup;

const data = new SlashCommandBuilder()
  .setName(CommandName.WARN_SETUP)
  .setDescription(commandCopy.warnSetup.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    requireAdministrator(interaction);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await warningPanelService.createPanel(guild);
      await interaction.editReply(
        result.created ? M.deployed(result.channelId) : M.updated(result.channelId),
      );
    } catch (err) {
      if (err instanceof DomainError) {
        await interaction.editReply(err.message);
        return;
      }
      log.error("warn-setup failed", err);
      await interaction.editReply(commonMessages.errors.commandCrashed);
    }
  },
});
