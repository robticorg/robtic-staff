import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { canManageTicket } from "../services/ticket-permissions.ts";
import { performTicketTransfer } from "../services/ticket-transfer-flow.ts";
import { ticketService } from "../services/ticket.service.ts";
import { TicketModalField } from "./component-ids.ts";

const log = logger.child("tickets:transfer");
const M = ticketMessages;

export async function handleTransferModal(
  interaction: ModalSubmitInteraction,
  ticketId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const targetId = [
    ...(interaction.fields.getSelectedUsers(TicketModalField.transferTarget)?.keys() ?? []),
  ][0];
  const reason = interaction.fields.getTextInputValue(TicketModalField.transferReason).trim();

  if (!targetId) {
    await interaction.reply({ content: M.transfer.targetMissing, flags: MessageFlags.Ephemeral });
    return;
  }
  if (!reason) {
    await interaction.reply({ content: M.transfer.reasonMissing, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const ticket = await ticketService.getTicket(ticketId);
    if (!ticket || ticket.guildId !== interaction.guildId) {
      await interaction.editReply(ticket ? M.common.wrongGuild : M.common.ticketGone);
      return;
    }
    const panel = ticketConfigService.getPanel(ticket.panelId);
    if (!panel) {
      await interaction.editReply(M.create.unknownPanel);
      return;
    }
    if (!canManageTicket(interaction.member, ticket)) {
      await interaction.editReply(M.options.notAllowed);
      return;
    }

    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      await interaction.editReply(M.transfer.targetNotInGuild);
      return;
    }

    const outcome = await performTicketTransfer({
      ticketId,
      actor: interaction.member,
      target,
      panel,
      reason,
    });
    await interaction.editReply(outcome.reply);
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("transfer failed", err);
    await interaction.editReply(M.common.genericError);
  }
}
