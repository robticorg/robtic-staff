import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { buildTicketNotice } from "../../../modules/tickets/render/notice.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { resolveTicketContext } from "../_shared/guards.ts";
import { StaffPointTransactionType, pointValuesService } from "../../../modules/staff/index.ts";

export default definePrefixCommand({
  name: "claim",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    const result = await ticketService.claimTicket(ticket.ticketId, ctx.member, panel);
    await ctx.replyWith(
      buildTicketNotice(
        [
          result.pointAwarded
            ? prefixMessages.ticket.claimed(
                ticket.ticketId,
                await pointValuesService.valueOf(ticket.guildId, StaffPointTransactionType.TICKET_CLAIM),
              )
            : prefixMessages.ticket.claimedNoPoint(ticket.ticketId),
        ],
        { tone: "success" },
      ),
    );
  },
});
