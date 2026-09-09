import type { PrefixContext } from "../../../discord/prefix-command.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { ticketConfigService } from "../../../modules/tickets/index.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import type { TicketDocument } from "../../../modules/tickets/models/ticket.model.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../../modules/tickets/types/enums.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";

export class PrefixAbort extends DomainError {
  constructor(message = "") {
    super("PREFIX_ABORT", message);
  }
}

export async function requireStaff(ctx: PrefixContext): Promise<void> {
  if (!(await staffPermissionService.isStaff(ctx.member))) {
    throw new PrefixAbort(prefixMessages.common.notStaff);
  }
}

export async function requireStaffManager(ctx: PrefixContext): Promise<void> {
  if (!(await staffPermissionService.isStaffManager(ctx.member))) {
    throw new PrefixAbort(prefixMessages.common.notStaffManager);
  }
}

export interface TicketContext {
  ticket: TicketDocument;
  panel: TicketPanelConfig;
}

export async function resolveTicketContext(ctx: PrefixContext): Promise<TicketContext> {
  const ticket = await ticketService.getTicketByChannel(ctx.channel.id);
  if (!ticket || ticket.guildId !== ctx.guild.id) {
    throw new PrefixAbort(prefixMessages.ticket.notATicket);
  }
  if (!(ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status)) {
    throw new PrefixAbort(prefixMessages.ticket.ticketClosed);
  }
  const panel = ticketConfigService.getPanel(ticket.panelId);
  if (!panel) throw new PrefixAbort(prefixMessages.ticket.notATicket);
  return { ticket, panel };
}
