import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, commandCopy } from "../../data/commands/index.ts";
import { staffMessages } from "../../data/messages/staff.ts";
import { staffPromotionPointsService } from "../../modules/staff/services/staff-promotion-points.service.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const M = staffMessages.promotionPoints;

const data = new SlashCommandBuilder()
  .setName(CommandName.PROMOTE_POINTS)
  .setDescription(commandCopy.promotePoints.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addIntegerOption((o) =>
    o
      .setName(CommandOption.POINTS)
      .setDescription(commandCopy.promotePoints.options.points)
      .setRequired(true)
      .setMinValue(1),
  );

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    requireAdministrator(interaction);

    const points = interaction.options.getInteger(CommandOption.POINTS, true);
    if (!Number.isInteger(points) || points < 1) {
      throw new CommandError(M.invalidPoints);
    }

    const saved = await staffPromotionPointsService.configureRequiredPoints(guild.id, points);
    await replySuccess(interaction, M.configured(saved), M.configuredNote);
  },
});
