import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, TicketSubcommand } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { ticketSetupCommandMessages } from "../../data/tickets/setup-command.ts";
import { buildSendModal, buildSetupModal } from "../../modules/tickets/panel-config/render.ts";
import { isSetupConfigurable } from "../../modules/tickets/panel-config/setup-rules.ts";
import { ticketConfigService } from "../../modules/tickets/services/ticket-config.service.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";

const M = ticketSetupCommandMessages;

const data = new SlashCommandBuilder()
  .setName(CommandName.TICKET)
  .setDescription(M.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) => s.setName(TicketSubcommand.SETUP).setDescription(M.setup))
  .addSubcommand((s) => s.setName(TicketSubcommand.SEND).setDescription(M.send));

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);
    const sub = interaction.options.getSubcommand();
    if (sub === TicketSubcommand.SETUP) {
      await interaction.showModal(buildSetupModal(ticketConfigService.listPanels().filter(isSetupConfigurable)));
      return;
    }
    if (sub === TicketSubcommand.SEND) {
      await interaction.showModal(buildSendModal());
      return;
    }
    throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
  },
});
