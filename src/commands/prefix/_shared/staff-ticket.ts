import { StaffApplicationWorkflow } from "../../../data/staff-application/panels.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../../modules/tickets/types/enums.ts";
import type { PrefixContext } from "../../../discord/prefix-command.ts";
import { PrefixAbort } from "./guards.ts";

export const STAFF_TICKET_PANELS: readonly string[] = Object.values(StaffApplicationWorkflow);

export function isStaffTicket(ticket: { guildId: string; panelId: string; status: string } | null, guildId: string): boolean {
  return (
    !!ticket &&
    ticket.guildId === guildId &&
    STAFF_TICKET_PANELS.includes(ticket.panelId) &&
    (ACTIVE_TICKET_STATUSES as readonly string[]).includes(ticket.status as TicketStatus)
  );
}

export async function requireStaffTicket(ctx: PrefixContext): Promise<void> {
  const ticket = await ticketService.getTicketByChannel(ctx.channel.id);
  if (!isStaffTicket(ticket, ctx.guild.id)) throw new PrefixAbort();
}
