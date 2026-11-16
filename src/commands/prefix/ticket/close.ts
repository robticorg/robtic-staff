import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { limits } from "../../../data/config/limits.ts";
import { sleep } from "../../../shared/utils/sleep.ts";
import { buildTicketNotice } from "../../../modules/tickets/render/notice.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

import { ticketName } from "../../../modules/tickets/models/ticket.model.ts";
export default definePrefixCommand({
  name: "close",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    await ctx.replyWith(
      buildTicketNotice(
        [ticketMessages.close.confirming(ticketName(ticket), limits.ticketCloseConfirmSeconds)],
        { tone: "warning" },
      ),
    );
    await sleep(limits.ticketCloseConfirmSeconds * 1000);

    const result = await ticketService.closeTicket(ticket.ticketId, ctx.member.id, panel, ctx.guild);
    await ticketService.recordCompletionCredit(result.ticket).catch(() => undefined);

    // A surviving channel already gets the closed-ticket panel from `closeTicket`.
  },
});

