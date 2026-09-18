import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { buildTicketNotice } from "../../../modules/tickets/render/notice.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "delete",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    await ctx.replyWith(
      buildTicketNotice([prefixMessages.ticket.willBeDeleted], { tone: "warning" }),
    );
    await ticketService.deleteTicket(ticket.ticketId, ctx.member.id, ctx.guild, panel);
  },
});
