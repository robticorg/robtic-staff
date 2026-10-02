import {
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { Ticket } from "../models/ticket.model.ts";
import { TicketLogAction } from "../types/enums.ts";

const I = ticketMessages.info;
const L = ticketMessages.log;

/** How many history / command rows fit before older ones are summarised. */
const SHOWN = 15;
/** One text block's limit. */
const TEXT_MAX = 4000;

const ACTION_LABEL: Record<string, string> = {
  [TicketLogAction.TICKET_CREATED]: L.titleCreated,
  [TicketLogAction.TICKET_CLAIMED]: L.titleClaimed,
  [TicketLogAction.TICKET_TRANSFERRED]: L.titleTransferred,
  [TicketLogAction.TICKET_UNCLAIMED]: L.titleUnclaimed,
  [TicketLogAction.TICKET_SLEEP]: L.titleSleep,
  [TicketLogAction.TICKET_SLEEP_CANCELLED]: L.titleSleepCancelled,
  [TicketLogAction.TICKET_RENAMED]: L.titleRenamed,
  [TicketLogAction.TICKET_CLOSED]: L.titleClosed,
  [TicketLogAction.TICKET_REOPENED]: L.titleReopened,
  [TicketLogAction.TICKET_DELETED]: L.titleDeleted,
  [TicketLogAction.TICKET_DELETED_MANUALLY]: L.titleDeletedManually,
  [TicketLogAction.USER_ADDED]: L.titleUserAdded,
  [TicketLogAction.USER_REMOVED]: L.titleUserRemoved,
  [TicketLogAction.ROLE_ADDED]: L.titleRoleAdded,
  [TicketLogAction.ROLE_REMOVED]: L.titleRoleRemoved,
};

type InfoTicket = Pick<
  Ticket,
  | "ticketId"
  | "userId"
  | "status"
  | "answers"
  | "claimedByDiscordId"
  | "claimedAt"
  | "firstClaimedByDiscordId"
  | "firstClaimedAt"
  | "transferredFrom"
  | "transferredAt"
  | "transferReason"
  | "addedUsers"
  | "addedRoles"
  | "sleepDueAt"
  | "sleepStartedBy"
  | "closedAt"
  | "closedBy"
  | "reopenedAt"
  | "reopenedBy"
  | "transcriptId"
  | "events"
> & { createdAt?: Date };

const clip = (text: string) => (text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX - 1)}…` : text);

function tail<T>(rows: readonly T[], render: (row: T) => string): string {
  if (rows.length === 0) return I.none;
  const shown = rows.slice(-SHOWN).map(render);
  return rows.length > SHOWN ? [I.olderHidden(rows.length - SHOWN), ...shown].join("\n") : shown.join("\n");
}

/** Everything known about a ticket, for admins (!ticket). */
export function buildTicketInfoCard(ticket: InfoTicket, panelName: string): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.info);
  const section = (text: string) => {
    container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents((t) => t.setContent(clip(text)));
  };

  container.addTextDisplayComponents((t) =>
    t.setContent(
      [
        I.title(ticket.ticketId, panelName),
        I.status(I.statuses[ticket.status] ?? ticket.status),
        ticket.createdAt ? I.openedBy(ticket.userId, ticket.createdAt) : null,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  );

  if (ticket.answers.length > 0) {
    section([I.answersHeading, ...ticket.answers.map((a) => I.answer(a.question, a.answer))].join("\n"));
  }

  const claim: string[] = [I.claimHeading];
  if (!ticket.claimedByDiscordId) {
    claim.push(I.unclaimed);
  } else {
    claim.push(I.claimedBy(ticket.claimedByDiscordId, ticket.claimedAt ?? null));
    const first = ticket.firstClaimedByDiscordId ?? ticket.transferredFrom;
    if (first && first !== ticket.claimedByDiscordId) {
      claim.push(I.firstClaimedBy(first, ticket.firstClaimedAt ?? null));
    }
    if (ticket.transferredFrom && ticket.transferredAt) {
      claim.push(I.handover(ticket.transferredFrom, ticket.transferredAt, ticket.transferReason ?? null));
    }
  }
  section(claim.join("\n"));

  if (ticket.addedUsers.length > 0 || ticket.addedRoles.length > 0) {
    section([I.peopleHeading, I.people(ticket.addedUsers, ticket.addedRoles)].join("\n"));
  }

  const state = [
    ticket.sleepDueAt ? I.sleeping(ticket.sleepStartedBy ?? null, ticket.sleepDueAt) : null,
    ticket.closedAt ? I.closed(ticket.closedBy ?? null, ticket.closedAt) : null,
    ticket.reopenedAt ? I.reopened(ticket.reopenedBy ?? null, ticket.reopenedAt) : null,
    ticket.transcriptId ? I.transcript(ticket.transcriptId) : null,
  ].filter((l): l is string => !!l);
  if (state.length > 0) section(state.join("\n"));

  const events = ticket.events ?? [];
  const actions = events.filter((e) => e.action !== "COMMAND");
  const commands = events.filter((e) => e.action === "COMMAND");

  section(
    [
      I.historyHeading,
      tail(actions, (e) =>
        I.historyRow(
          e.at,
          ACTION_LABEL[e.action] ?? e.action,
          e.actorId,
          [e.targetId ? `→ <@${e.targetId}>` : "", e.detail ?? ""].filter(Boolean).join(" · "),
        ),
      ),
    ].join("\n"),
  );
  section([I.commandsHeading, tail(commands, (e) => I.commandRow(e.at, e.actorId, e.detail ?? ""))].join("\n"));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}
