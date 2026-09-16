import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import {
  CommandName,
  CommandOption,
  TicketStatsSubcommand,
  commandCopy,
} from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { statsMessages } from "../../data/messages/stats.ts";
import { staffService } from "../../modules/staff/index.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";
import { replySuccess } from "../_shared/responses.ts";

const copy = commandCopy.ticketStats;
const M = statsMessages.reset;

const data = new SlashCommandBuilder()
  .setName(CommandName.TICKET_STATS)
  .setDescription(copy.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(TicketStatsSubcommand.RESET)
      .setDescription(copy.sub.reset.description)
      .addUserOption((o) =>
        o.setName(CommandOption.MEMBER).setDescription(copy.sub.reset.options.member),
      ),
  );

async function handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const member = interaction.options.getUser(CommandOption.MEMBER);

  if (member) {
    const staff = await staffService.get(member.id, guild.id);
    if (!staff) throw new CommandError(statsMessages.admin.notStaff(`<@${member.id}>`));

    const result = await staffService.resetTicketCounters(staff._id);
    await replySuccess(
      interaction,
      result.reset
        ? M.one(`<@${member.id}>`, result.previous)
        : M.nothingToDo(`<@${member.id}>`),
      M.note,
    );
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const summary = await staffService.resetTicketCountersForGuild(guild.id);
  await replySuccess(interaction, M.all(summary.resetCount, summary.totalStaff), M.note);
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    requireGuild(interaction);
    requireAdministrator(interaction);

    const sub = interaction.options.getSubcommand();
    if (sub === TicketStatsSubcommand.RESET) return handleReset(interaction);
    throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
  },
});
