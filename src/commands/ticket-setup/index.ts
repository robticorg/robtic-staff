import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { ticketMessages } from "../../data/messages/tickets.ts";
import { DomainError } from "../../shared/utils/errors.ts";
import { logger } from "../../shared/utils/logger.ts";
import { ticketSetupService } from "../../modules/tickets/index.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:ticket-setup");
const M = ticketMessages.setup;

const data = new SlashCommandBuilder()
  .setName(CommandName.TICKET_SETUP)
  .setDescription(commandCopy.ticketSetup.description)
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
      const result = await ticketSetupService.deploy(guild);
      await interaction.editReply(
        result.created
          ? M.deployed(result.channelId, result.panelCount)
          : M.updated(result.channelId, result.panelCount),
      );
    } catch (err) {
      if (err instanceof DomainError) {
        await interaction.editReply(err.message);
        return;
      }
      log.error("ticket-setup failed", err);
      await interaction.editReply(ticketMessages.common.genericError);
    }
  },
});
