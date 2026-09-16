import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { defineCommand } from "../../discord/command.ts";
import { CommandName, CommandOption, commandCopy } from "../../data/commands/index.ts";
import { ticketMessages } from "../../data/messages/tickets.ts";
import { ticketConfigService } from "../../modules/tickets/services/ticket-config.service.ts";
import { ticketService } from "../../modules/tickets/services/ticket.service.ts";
import {
  resolveSleepDuration,
  ticketSleepService,
} from "../../modules/tickets/services/ticket-sleep.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../modules/tickets/types/enums.ts";
import { CommandError, requireGuild, requireMember } from "../_shared/guards.ts";

const M = ticketMessages;

const data = new SlashCommandBuilder()
  .setName(CommandName.SLEEP)
  .setDescription(commandCopy.sleep.description)
  .setContexts(InteractionContextType.Guild)
  .addStringOption((o) =>
    o.setName(CommandOption.TIME).setDescription(commandCopy.sleep.options.time),
  );

export default defineCommand({
  data,
  async execute(interaction) {
    const guild = requireGuild(interaction);
    const member = await requireMember(interaction);

    const ticket = await ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket || ticket.guildId !== guild.id) {
      throw new CommandError(M.common.notATicket);
    }
    if (!(ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status)) {
      throw new CommandError(M.sleep.notOpen);
    }
    const panel = ticketConfigService.getPanel(ticket.panelId);
    if (!panel) throw new CommandError(M.create.unknownPanel);

    const durationMs = resolveSleepDuration(interaction.options.getString(CommandOption.TIME));

    const result = await ticketSleepService.startSleep({
      ticketId: ticket.ticketId,
      actor: member,
      panel,
      durationMs,
    });

    const lines = [
      M.sleep.started(result.duration, result.dueAt),
      result.dmDelivered ? null : M.sleep.dmFailed(ticket.userId),
    ].filter((line): line is string => line !== null);

    await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral });

    const channel = interaction.channel;
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send({
          content: M.sleep.channelNote(ticket.userId, result.duration),
          allowedMentions: { users: [ticket.userId] },
        })
        .catch(() => undefined);
    }
  },
});
