import type { TicketPanelConfig } from "../../data/tickets/index.ts";
import type { GuildId } from "../../shared/types/index.ts";
import { FastAccessContext } from "../configuration/types/enums.ts";
import { modmailCaseService } from "../modmail/services/modmail-case.service.ts";
import type { TicketDocument } from "../tickets/models/ticket.model.ts";
import { ticketConfigService } from "../tickets/services/ticket-config.service.ts";
import { ticketService } from "../tickets/services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../tickets/types/enums.ts";

export interface DetectedContext {
  context: FastAccessContext;
  referenceId: string;

  ticket?: TicketDocument;
  panel?: TicketPanelConfig;
}

export async function detectFastAccessContext(
  channelId: string,
  guildId: GuildId,
): Promise<DetectedContext | null> {
  const ticket = await ticketService.getTicketByChannel(channelId);
  if (
    ticket &&
    ticket.guildId === guildId &&
    (ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status)
  ) {
    const panel = ticketConfigService.getPanel(ticket.panelId);
    return {
      context: panel?.fastAccessContext ?? FastAccessContext.SUPPORT,
      referenceId: ticket.ticketId,
      ticket,
      ...(panel ? { panel } : {}),
    };
  }

  const kase = await modmailCaseService.getByThreadId(channelId);
  if (kase && kase.guildId === guildId && modmailCaseService.isOpen(kase.status)) {
    return { context: FastAccessContext.MODMAIL, referenceId: kase.caseId };
  }

  return null;
}
