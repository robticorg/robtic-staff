import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { buildBotProfileModal } from "../../modules/bot-profile/bot-profile-form.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";

const CONFIG = "config";

const data = new SlashCommandBuilder()
  .setName(CommandName.PROFILE)
  .setDescription(commandCopy.profile.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) => s.setName(CONFIG).setDescription(commandCopy.profile.subcommands.config));

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    requireAdministrator(interaction);
    const me = guild.members.me ?? (await guild.members.fetchMe());
    await interaction.showModal(buildBotProfileModal(me.nickname));
  },
});
