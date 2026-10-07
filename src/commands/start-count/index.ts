import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, commandCopy } from "../../data/commands/index.ts";
import { startCountMessages } from "../../data/messages/point-values.ts";
import { LEVEL_START_VALUES, staffConfigService } from "../../modules/configuration/services/staff-config.service.ts";
import { requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const START_OPTION = "start";

const data = new SlashCommandBuilder()
  .setName(CommandName.START_COUNT)
  .setDescription(commandCopy.startCount.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addIntegerOption((o) =>
    o
      .setName(START_OPTION)
      .setDescription(commandCopy.startCount.options.start)
      .setRequired(true)
      .addChoices(...LEVEL_START_VALUES.map((value) => ({ name: String(value), value }))),
  );

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    requireAdministrator(interaction);
    const start = interaction.options.getInteger(START_OPTION, true);
    await staffConfigService.setLevelStart(guild.id, start);
    await replySuccess(interaction, startCountMessages.saved(start));
  },
});
