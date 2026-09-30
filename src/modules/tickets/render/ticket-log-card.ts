import type { MessageCreateOptions } from "discord.js";
import { buildLogCard, type LogField, type LogTone } from "../../../libs/discord/index.ts";
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
    case TicketLogAction.TICKET_TRANSFERRED:
      return L.titleTransferred;
    case TicketLogAction.TICKET_SLEEP:
      return L.titleSleep;
    case TicketLogAction.TICKET_SLEEP_CANCELLED:
      return L.titleSleepCancelled;
    case TicketLogAction.TICKET_RENAMED:
      return L.titleRenamed;
    case TicketLogAction.TICKET_CLOSED:
      return L.titleClosed;
    case TicketLogAction.TICKET_REOPENED:
      return L.titleReopened;
    case TicketLogAction.TICKET_DELETED:
      return L.titleDeleted;
    case TicketLogAction.TICKET_DELETED_MANUALLY:
      return L.titleDeletedManually;
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

function colorFor(action: TicketLogAction): LogTone {
  switch (action) {
    case TicketLogAction.TICKET_CREATED:
    case TicketLogAction.USER_ADDED:
    case TicketLogAction.ROLE_ADDED:
      return "success";
    case TicketLogAction.TICKET_DELETED:
    case TicketLogAction.TICKET_DELETED_MANUALLY:
    case TicketLogAction.USER_REMOVED:
    case TicketLogAction.ROLE_REMOVED:
      return "error";
    case TicketLogAction.TICKET_CLOSED:
    case TicketLogAction.TICKET_SLEEP:
      return "warning";
    case TicketLogAction.TICKET_SLEEP_CANCELLED:
    case TicketLogAction.TICKET_REOPENED:
      return "success";
    case TicketLogAction.TICKET_CLAIMED:
    case TicketLogAction.TICKET_TRANSFERRED:
      return "info";
    default:
      return "info";
  }
}

type Field = { name: string; value: string; inline?: boolean };

/**
 * What a ticket log entry says (title, colour, fields) — kept apart from the layout.
 * null when the action isn't logged or lacks what it needs (e.g. no member for USER_ADDED).
 */
export function ticketLogContent(
  action: TicketLogAction,
  ctx: TicketLogContext,
): { title: string; tone: LogTone; fields: LogField[] } | null {
  const title = titleFor(action);
  if (!title) return null;

  const fields: Field[] = [
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
    case TicketLogAction.TICKET_DELETED_MANUALLY:
      fields.push({
        name: L.deletedBy,
        value: ctx.targetId ? `<@${ctx.targetId}>` : L.unknownActor,
        inline: true,
      });
      fields.push({ name: L.panel, value: ctx.panel.name, inline: true });
      fields.push({ name: L.reason, value: L.manualNote });
      break;
    case TicketLogAction.TICKET_SLEEP:
      if (ctx.targetId) fields.push({ name: L.member, value: `<@${ctx.targetId}>`, inline: true });
      if (ctx.name) fields.push({ name: L.duration, value: ctx.name, inline: true });
      if (ctx.dueAt) {
        fields.push({
          name: L.closesAt,
          value: `<t:${Math.floor(ctx.dueAt.getTime() / 1000)}:R>`,
          inline: true,
        });
      }
      break;
    case TicketLogAction.TICKET_SLEEP_CANCELLED:
      if (ctx.targetId) fields.push({ name: L.member, value: `<@${ctx.targetId}>`, inline: true });
      break;
    case TicketLogAction.TICKET_TRANSFERRED:
      if (ctx.fromId) fields.push({ name: L.from, value: `<@${ctx.fromId}>`, inline: true });
      if (ctx.targetId) fields.push({ name: L.to, value: `<@${ctx.targetId}>`, inline: true });
      fields.push({ name: L.reason, value: ctx.reason ?? "—" });
      break;
    case TicketLogAction.ROLE_ADDED:
    case TicketLogAction.ROLE_REMOVED:
      if (ctx.roleId) fields.push({ name: L.role, value: `<@&${ctx.roleId}>`, inline: true });
      break;
  }

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

  return {
    title: `### ${title}`,
    tone: colorFor(action),
    fields: fields.map((f) => ({ label: f.name, value: f.value })),
  };
}

/** The ticket log entry as a Components V2 card. */
export function buildTicketLogCard(
  action: TicketLogAction,
  ctx: TicketLogContext,
): MessageCreateOptions | null {
  const content = ticketLogContent(action, ctx);
  return content ? buildLogCard(content) : null;
}
