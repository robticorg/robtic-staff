import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName } from "../../data/commands/index.ts";
import { responsibilityMessages } from "../../data/responsibilities/messages.ts";
import { buildAddResponsibilityModal } from "../../modules/responsibilities/render/add-modal.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";

const data = new SlashCommandBuilder()
  .setName(CommandName.ADD_RES)
  .setDescription(responsibilityMessages.command.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild);

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);
    await interaction.showModal(buildAddResponsibilityModal());
  },
});
