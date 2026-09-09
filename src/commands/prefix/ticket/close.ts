import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "close",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, panel, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    const result = await ticketService.closeTicket(ticket.ticketId, ctx.member.id, panel, ctx.guild);
    await ticketService.recordCompletionCredit(result.ticket).catch(() => undefined);

    await ctx.reply(
      result.transcriptId
        ? prefixMessages.ticket.closedWithTranscript(ticket.ticketId, result.transcriptId)
        : prefixMessages.ticket.closed(ticket.ticketId),
    );
  },
});
