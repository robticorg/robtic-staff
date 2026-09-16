import type { EmbedBuilder } from "discord.js";
import { createEmbed } from "../../../data/embeds/index.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketLogAction } from "../types/enums.ts";
import type { TicketLogContext } from "../services/ticket-log.service.ts";

const L = ticketMessages.log;

function titleFor(action: TicketLogAction): string | null {
  switch (action) {
    case TicketLogAction.TICKET_CREATED:
      return L.titleCreated;
    case TicketLogAction.TICKET_CLAIMED:
      return L.titleClaimed;
    case TicketLogAction.TICKET_RENAMED:
      return L.titleRenamed;
    case TicketLogAction.TICKET_CLOSED:
      return L.titleClosed;
    case TicketLogAction.TICKET_DELETED:
      return L.titleDeleted;
    case TicketLogAction.USER_ADDED:
      return L.titleUserAdded;
    case TicketLogAction.USER_REMOVED:
      return L.titleUserRemoved;
    case TicketLogAction.ROLE_ADDED:
      return L.titleRoleAdded;
    case TicketLogAction.ROLE_REMOVED:
      return L.titleRoleRemoved;
    default:
      return null;
  }
}

function colorFor(action: TicketLogAction): "success" | "error" | "warning" | "info" | "primary" {
  switch (action) {
    case TicketLogAction.TICKET_CREATED:
    case TicketLogAction.USER_ADDED:
    case TicketLogAction.ROLE_ADDED:
      return "success";
    case TicketLogAction.TICKET_DELETED:
    case TicketLogAction.USER_REMOVED:
    case TicketLogAction.ROLE_REMOVED:
      return "error";
    case TicketLogAction.TICKET_CLOSED:
      return "warning";
    case TicketLogAction.TICKET_CLAIMED:
      return "info";
    default:
      return "primary";
  }
}

export function buildTicketLogEmbed(
  action: TicketLogAction,
  ctx: TicketLogContext,
): EmbedBuilder | null {
  const title = titleFor(action);
  if (!title) return null;

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: L.ticket, value: `\`${ctx.ticketId}\``, inline: true },
    { name: L.actor, value: `<@${ctx.actorId}>`, inline: true },
  ];

  switch (action) {
    case TicketLogAction.TICKET_CREATED:
      fields.push({ name: L.panel, value: ctx.panel.name, inline: true });
      break;
    case TicketLogAction.TICKET_RENAMED:
      fields.push({ name: L.newName, value: `\`${ctx.name ?? "?"}\``, inline: true });
      break;
    case TicketLogAction.USER_ADDED:
    case TicketLogAction.USER_REMOVED:
      if (ctx.targetId) fields.push({ name: L.member, value: `<@${ctx.targetId}>`, inline: true });
      break;
    case TicketLogAction.ROLE_ADDED:
    case TicketLogAction.ROLE_REMOVED:
      if (ctx.roleId) fields.push({ name: L.role, value: `<@&${ctx.roleId}>`, inline: true });
      break;
  }

  // The add/remove logs need a real target to mean anything.
  if (
    (action === TicketLogAction.USER_ADDED || action === TicketLogAction.USER_REMOVED) &&
    !ctx.targetId
  ) {
    return null;
  }
  if (
    (action === TicketLogAction.ROLE_ADDED || action === TicketLogAction.ROLE_REMOVED) &&
    !ctx.roleId
  ) {
    return null;
  }

  return createEmbed({
    title,
    color: colorFor(action),
    fields,
    timestamp: true,
  });
}
