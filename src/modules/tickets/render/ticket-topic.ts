import type { Ticket } from "../models/ticket.model.ts";

/** Discord's limit for a channel topic. */
const TOPIC_MAX = 1024;

/** "date • time" as Discord timestamps, so every reader sees their own timezone. */
function when(at: Date): string {
  const s = Math.floor(at.getTime() / 1000);
  return `<t:${s}:d> • <t:${s}:t>`;
}

type TopicTicket = Pick<
  Ticket,
  | "userId"
  | "claimedByDiscordId"
  | "claimedAt"
  | "firstClaimedByDiscordId"
  | "firstClaimedAt"
  | "transferredFrom"
  | "transferredAt"
> & { createdAt?: Date };

/**
 * The ticket channel's topic:
 *  unclaimed → "…and is currently **unclaimed**."
 *  claimed   → "…and claimed by @x at **date • time**."
 *  handed over → "…and claimed by @first at **…**, then handed over to @now at **…**."
 * `reason` is what the member opened the ticket for (the panel they picked).
 */
export function buildTicketTopic(ticket: TopicTicket, reason: string, now: Date = new Date()): string {
  const opened = `🎫 This ticket was opened by <@${ticket.userId}> for **${reason}**. It was opened at **${when(ticket.createdAt ?? now)}**`;

  if (!ticket.claimedByDiscordId) {
    return clip(`${opened} and is currently **unclaimed**.`);
  }

  const handedOver = !!ticket.transferredFrom && !!ticket.transferredAt;
  if (!handedOver) {
    return clip(`${opened} and claimed by <@${ticket.claimedByDiscordId}> at **${when(ticket.claimedAt ?? now)}**.`);
  }

  // Tickets handed over before firstClaimed* existed fall back to the last "from".
  const firstBy = ticket.firstClaimedByDiscordId ?? ticket.transferredFrom!;
  const firstAt = ticket.firstClaimedAt ? ` at **${when(ticket.firstClaimedAt)}**` : "";
  return clip(
    `${opened} and claimed by <@${firstBy}>${firstAt}, then handed over to <@${ticket.claimedByDiscordId}> at **${when(ticket.transferredAt!)}**.`,
  );
}

function clip(text: string): string {
  return text.length > TOPIC_MAX ? `${text.slice(0, TOPIC_MAX - 1)}…` : text;
}
