import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, PointsSubcommand, commandCopy } from "../../data/commands/index.ts";
import { statsMessages } from "../../data/messages/stats.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { staffPointService, staffService } from "../../modules/staff/index.ts";
import { StaffPointTransactionType } from "../../modules/staff/types/enums.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const M = statsMessages.admin;

const data = new SlashCommandBuilder()
  .setName(CommandName.POINTS)
  .setDescription(commandCopy.points.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(PointsSubcommand.ADD)
      .setDescription(commandCopy.points.sub.add.description)
      .addUserOption((o) =>
        o
          .setName(CommandOption.MEMBER)
          .setDescription(commandCopy.points.sub.add.options.member)
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName(CommandOption.AMOUNT)
          .setDescription(commandCopy.points.sub.add.options.amount)
          .setRequired(true)
          .setMinValue(1),
      )
      .addStringOption((o) =>
        o.setName(CommandOption.REASON).setDescription(commandCopy.points.sub.add.options.reason),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(PointsSubcommand.REMOVE)
      .setDescription(commandCopy.points.sub.remove.description)
      .addUserOption((o) =>
        o
          .setName(CommandOption.MEMBER)
          .setDescription(commandCopy.points.sub.remove.options.member)
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName(CommandOption.AMOUNT)
          .setDescription(commandCopy.points.sub.remove.options.amount)
          .setRequired(true)
          .setMinValue(1),
      )
      .addStringOption((o) =>
        o.setName(CommandOption.REASON).setDescription(commandCopy.points.sub.remove.options.reason),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName(PointsSubcommand.RESET)
      .setDescription(commandCopy.points.sub.reset.description)
      .addUserOption((o) =>
        o.setName(CommandOption.MEMBER).setDescription(commandCopy.points.sub.reset.options.member),
      ),
  );

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const member = interaction.options.getUser(CommandOption.MEMBER, true);
  const amount = interaction.options.getInteger(CommandOption.AMOUNT, true);
  const reason = interaction.options.getString(CommandOption.REASON) ?? M.defaultReason(interaction.user.id);

  const staff = await staffService.get(member.id, guild.id);
  if (!staff) throw new CommandError(M.notStaff(`<@${member.id}>`));

  const result = await staffPointService.add({
    staffId: staff._id,
    amount,
    type: StaffPointTransactionType.MANUAL_ADJUSTMENT,
    reason,
  });

  await replySuccess(interaction, M.added(`<@${member.id}>`, amount, result.balance ?? 0));
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const member = interaction.options.getUser(CommandOption.MEMBER, true);
  const amount = interaction.options.getInteger(CommandOption.AMOUNT, true);
  const reason = interaction.options.getString(CommandOption.REASON) ?? M.defaultReason(interaction.user.id);

  const staff = await staffService.get(member.id, guild.id);
  if (!staff) throw new CommandError(M.notStaff(`<@${member.id}>`));

  const result = await staffPointService.remove({
    staffId: staff._id,
    amount,
    type: StaffPointTransactionType.MANUAL_ADJUSTMENT,
    reason,
  });

  await replySuccess(interaction, M.removed(`<@${member.id}>`, amount, result.balance ?? 0));
}

async function handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const member = interaction.options.getUser(CommandOption.MEMBER);

  if (member) {
    const staff = await staffService.get(member.id, guild.id);
    if (!staff) throw new CommandError(M.notStaff(`<@${member.id}>`));

    const result = await staffPointService.resetToZero(staff._id, interaction.user.id);
    await replySuccess(
      interaction,
      result.reset
        ? M.resetOne(`<@${member.id}>`, result.previousBalance)
        : M.resetNothingToDo(`<@${member.id}>`),
    );
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const summary = await staffPointService.resetAllForGuild(guild.id, interaction.user.id);
  await replySuccess(interaction, M.resetAll(summary.resetCount, summary.totalStaff));
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case PointsSubcommand.ADD:
        return handleAdd(interaction);
      case PointsSubcommand.REMOVE:
        return handleRemove(interaction);
      case PointsSubcommand.RESET:
        return handleReset(interaction);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
});
