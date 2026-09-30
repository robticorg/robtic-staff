import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { buildTicketInfoCard } from "../../../modules/tickets/render/ticket-info.ts";
import { memberIsAdministrator } from "../../../modules/tickets/services/ticket-permissions.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

/** !ticket — everything about this ticket, for administrators only. */
export default definePrefixCommand({
  name: "ticket",
  category: "ticket",
  async execute(ctx) {
    // Silent outside a ticket (like every ticket command); closed tickets still answer.
    const { ticket, panel } = await resolveTicketContext(ctx, { allowClosed: true });
    if (!memberIsAdministrator(ctx.member)) throw new PrefixAbort(ticketMessages.info.adminOnly);
    await ctx.replyWith(buildTicketInfoCard(ticket, panel.name));
  },
});
