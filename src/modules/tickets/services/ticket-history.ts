import type { ChannelId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { TICKET_EVENT_CAP, TicketModel, type TicketEvent } from "../models/ticket.model.ts";

const log = logger.child("tickets:history");

type NewEvent = Omit<TicketEvent, "at"> & { at?: Date };

function push(filter: Record<string, unknown>, event: NewEvent): Promise<void> {
  return TicketModel.updateOne(filter, {
    $push: {
      events: {
        $each: [{ ...event, detail: event.detail?.slice(0, 300), at: event.at ?? new Date() }],
        $slice: -TICKET_EVENT_CAP,
      },
    },
  })
    .exec()
    .then(() => undefined)
    .catch((err) => log.warn("ticket history write failed", err));
}

/** An action on a ticket (claimed, handed over, renamed…) — shown by !ticket. */
export function recordTicketEvent(ticketId: string, event: NewEvent): Promise<void> {
  return push({ ticketId }, event);
}

/**
 * A command typed in a channel. Matches nothing (no write) unless the channel is a
 * ticket, so it's safe to call for every command.
 */
export function recordTicketCommand(channelId: ChannelId, actorId: string, invocation: string): Promise<void> {
  return push({ channelId }, { action: "COMMAND", actorId, detail: invocation });
}
