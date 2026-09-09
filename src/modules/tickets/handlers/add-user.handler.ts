import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { canManageTicket } from "../services/ticket-permissions.ts";
import { ticketService } from "../services/ticket.service.ts";
import { TicketModalField } from "./component-ids.ts";

const log = logger.child("tickets:add-user");
const M = ticketMessages;

export async function handleAddUserModal(
  interaction: ModalSubmitInteraction,
  ticketId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const userIds = [...(interaction.fields.getSelectedUsers(TicketModalField.addUsers)?.keys() ?? [])];
  const roleIds = [...(interaction.fields.getSelectedRoles(TicketModalField.addRoles)?.keys() ?? [])];

  if (userIds.length === 0 && roleIds.length === 0) {
    await interaction.reply({ content: M.addUser.nothingSelected, flags: MessageFlags.Ephemeral });
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
    if (!canManageTicket(interaction.member, panel, ticket)) {
      await interaction.editReply(M.options.notAllowed);
      return;
    }

    const result = await ticketService.addUser(ticketId, interaction.member, panel, {
      users: userIds,
      roles: roleIds,
    });
    await interaction.editReply(M.addUser.done(result.users, result.roles));
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("add user failed", err);
    await interaction.editReply(M.common.genericError);
  }
}
