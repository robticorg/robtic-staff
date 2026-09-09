import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import { canManageTicket } from "../services/ticket-permissions.ts";
import { ticketService } from "../services/ticket.service.ts";
import { TicketModalField } from "./component-ids.ts";

const log = logger.child("tickets:remove-user");
const M = ticketMessages;

export async function handleRemoveUserModal(
  interaction: ModalSubmitInteraction,
  ticketId: string,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  let selected: readonly string[] = [];
  try {
    selected = interaction.fields.getStringSelectValues(TicketModalField.removeTargets);
  } catch {
    selected = [];
  }
  if (selected.length === 0) {
    await interaction.reply({ content: M.removeUser.nothingSelected, flags: MessageFlags.Ephemeral });
    return;
  }

  const users: string[] = [];
  const roles: string[] = [];
  for (const value of selected) {
    const [kind, id] = value.split(":");
    if (kind === "user" && id) users.push(id);
    else if (kind === "role" && id) roles.push(id);
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

    const result = await ticketService.removeUser(ticketId, interaction.member, panel, {
      users,
      roles,
    });
    const parts = [M.removeUser.done(result.removed)];
    if (result.skipped > 0) parts.push(M.removeUser.protectedSkipped);
    await interaction.editReply(parts.join("\n"));
  } catch (err) {
    if (err instanceof DomainError) {
      await interaction.editReply(err.message);
      return;
    }
    log.error("remove user failed", err);
    await interaction.editReply(M.common.genericError);
  }
}
