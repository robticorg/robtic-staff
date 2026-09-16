import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { ticketService } from "../services/ticket.service.ts";
import { canManageTicket } from "../services/ticket-permissions.ts";
import { TicketModalField } from "./component-ids.ts";

const log = logger.child("tickets:rename");
const M = ticketMessages;

export async function handleRenameModal(
  interaction: ModalSubmitInteraction,
  ticketId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const newName = interaction.fields.getTextInputValue(TicketModalField.newName).trim();
  if (!newName) {
    await interaction.reply({ content: M.common.genericError, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const ticket = await ticketService.getTicket(ticketId);
    if (!ticket || ticket.guildId !== interaction.guildId) {
      await interaction.editReply(ticket ? M.common.wrongGuild : M.common.ticketGone);
      return;
    }
    if (!canManageTicket(interaction.member, ticket)) {
      await interaction.editReply(M.options.notAllowed);
      return;
    }

    const updated = await ticketService.renameTicket(ticketId, newName, interaction.member);
    const channel = await interaction.guild.channels.fetch(updated.channelId).catch(() => null);
    await interaction.editReply(
      M.renameTicket.done(channel && "name" in channel ? channel.name : newName),
    );
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("rename failed", err);
    await interaction.editReply(M.common.genericError);
  }
}
