import { ValidationError } from "../../../shared/utils/errors.ts";

export const TicketStatus = {
  OPEN: "OPEN",
  CLAIMED: "CLAIMED",
  CLOSING: "CLOSING",
  CLOSED: "CLOSED",
  DELETED: "DELETED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
export const TICKET_STATUS_VALUES = Object.values(TicketStatus);

export const ACTIVE_TICKET_STATUSES: readonly TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.CLAIMED,
  TicketStatus.CLOSING,
];

export const TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.CLAIMED, TicketStatus.CLOSING, TicketStatus.CLOSED],
  [TicketStatus.CLAIMED]: [TicketStatus.OPEN, TicketStatus.CLOSING, TicketStatus.CLOSED],
  [TicketStatus.CLOSING]: [TicketStatus.CLOSED, TicketStatus.OPEN],
  [TicketStatus.CLOSED]: [TicketStatus.DELETED, TicketStatus.OPEN],
  [TicketStatus.DELETED]: [],
};

export function canTicketTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return true;
  return TICKET_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTicketTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTicketTransition(from, to)) {
    throw new ValidationError(`Illegal ticket transition: ${from} → ${to}`, { from, to });
  }
}

export const TicketLogAction = {
  TICKET_CREATED: "TICKET_CREATED",
  TICKET_CLAIMED: "TICKET_CLAIMED",
  TICKET_RENAMED: "TICKET_RENAMED",
  TICKET_CLOSED: "TICKET_CLOSED",
  TICKET_DELETED: "TICKET_DELETED",
  USER_ADDED: "USER_ADDED",
  USER_REMOVED: "USER_REMOVED",
  ROLE_ADDED: "ROLE_ADDED",
  ROLE_REMOVED: "ROLE_REMOVED",
} as const;
export type TicketLogAction = (typeof TicketLogAction)[keyof typeof TicketLogAction];

export const TranscriptFormat = {
  JSON: "JSON",
} as const;
export type TranscriptFormat = (typeof TranscriptFormat)[keyof typeof TranscriptFormat];
