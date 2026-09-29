import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type SlashCommandStringOption,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, IntakeSubcommand } from "../../data/commands/index.ts";
import { commonMessages } from "../../data/messages/common.ts";
import { intakeMessages } from "../../data/intake/messages.ts";
import { logger } from "../../shared/utils/logger.ts";
import { intakeService } from "../../modules/intake/services/intake.service.ts";
import { CommandError, requireAdministrator, requireGuild } from "../_shared/guards.ts";

const log = logger.child("command:intake");
const M = intakeMessages.command;

const targetOption = (o: SlashCommandStringOption) =>
  o.setName(CommandOption.TARGET).setDescription(M.target).setRequired(true).setAutocomplete(true);

const data = new SlashCommandBuilder()
  .setName(CommandName.INTAKE)
  .setDescription(M.description)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((s) =>
    s
      .setName(IntakeSubcommand.CLOSE)
      .setDescription(M.close)
      .addStringOption(targetOption)
      .addStringOption((o) =>
        o.setName(CommandOption.REASON).setDescription(M.reason).setMaxLength(300),
      ),
  )
  .addSubcommand((s) =>
    s.setName(IntakeSubcommand.OPEN).setDescription(M.open).addStringOption(targetOption),
  )
  .addSubcommand((s) => s.setName(IntakeSubcommand.LIST).setDescription(M.list));

function requireTarget(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getString(CommandOption.TARGET, true);
  const info = intakeService.describe(target);
  if (!info) throw new CommandError(M.unknownTarget);
  return info;
}

async function handleList(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const rows = await intakeService.list(guildId);
  const line = (r: (typeof rows)[number]) =>
    r.closure
      ? M.closedRow(r.label, r.closure.closedBy, r.closure.closedAt, r.closure.reason ?? null)
      : M.openRow(r.label);
  const body = [
    M.listTitle,
    "",
    M.applicationsGroup,
    ...rows.filter((r) => r.group === "APPLICATION").map(line),
    "",
    M.ticketsGroup,
    ...rows.filter((r) => r.group === "TICKET").map(line),
  ].join("\n");
  await interaction.reply({ content: body, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

export default defineCommand({
  data,
  requiredPermissions: PermissionFlagsBits.Administrator,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    requireAdministrator(interaction);

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case IntakeSubcommand.CLOSE: {
        const info = requireTarget(interaction);
        const reason = interaction.options.getString(CommandOption.REASON)?.trim() || null;
        const closed = await intakeService.close(guild.id, info.target, interaction.user.id, reason);
        await interaction.reply({
          content: closed ? M.closedDone(info.label) : M.alreadyClosed(info.label),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      case IntakeSubcommand.OPEN: {
        const info = requireTarget(interaction);
        const opened = await intakeService.open(guild.id, info.target);
        await interaction.reply({
          content: opened ? M.openedDone(info.label) : M.alreadyOpen(info.label),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      case IntakeSubcommand.LIST:
        return handleList(interaction, guild.id);
      default:
        throw new CommandError(commonMessages.errors.unknownSubcommand(sub));
    }
  },
  async autocomplete(interaction) {
    try {
      if (!interaction.inGuild()) return void (await interaction.respond([]));
      const query = String(interaction.options.getFocused()).toLowerCase();
      const sub = interaction.options.getSubcommand();
      const rows = await intakeService.list(interaction.guildId);
      const matches = rows
        // Offer only what the subcommand can change: open things to close, closed things to open.
        .filter((r) => (sub === IntakeSubcommand.OPEN ? !!r.closure : !r.closure))
        .filter((r) => r.label.toLowerCase().includes(query))
        .slice(0, 25);
      await interaction.respond(
        matches.map((r) => ({ name: `${r.closure ? "🔴" : "🟢"} ${r.label}`.slice(0, 100), value: r.target })),
      );
    } catch (err) {
      log.warn("intake autocomplete failed", err);
      await interaction.respond([]).catch(() => undefined);
    }
  },
});
