import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { buildTicketNotice } from "../../../modules/tickets/render/notice.ts";
import {
  canManageClosedTicket,
  canManageTicket,
} from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { TicketStatus } from "../../../modules/tickets/types/enums.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "delete",
  category: "ticket",
  async execute(ctx) {
    // A panel with `close.delete: false` leaves the channel behind, so `!delete`
    // has to work on a closed ticket too — that is how staff clean those up.
    const { ticket, panel } = await resolveTicketContext(ctx, { allowClosed: true });

    const allowed =
      ticket.status === TicketStatus.CLOSED
        ? canManageClosedTicket(ctx.member, panel, ticket)
        : canManageTicket(ctx.member, ticket);
    if (!allowed) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    await ctx.replyWith(
      buildTicketNotice([prefixMessages.ticket.willBeDeleted], { tone: "warning" }),
    );
    await ticketService.deleteTicket(ticket.ticketId, ctx.member.id, ctx.guild, panel);
  },
});
