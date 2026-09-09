import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { resolveTicketContext } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "claim",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    const result = await ticketService.claimTicket(ticket.ticketId, ctx.member, panel);
    await ctx.reply(
      result.pointAwarded
        ? prefixMessages.ticket.claimed(ticket.ticketId)
        : prefixMessages.ticket.claimedNoPoint(ticket.ticketId),
    );
  },
});
