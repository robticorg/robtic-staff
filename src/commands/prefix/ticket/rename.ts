import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { buildTicketNotice } from "../../../modules/tickets/render/notice.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "rename",
  category: "ticket",
  async execute(ctx) {
    const { ticket } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    const newName = ctx.rest.trim();
    if (!newName) {
      throw new PrefixAbort(prefixMessages.ticket.renameUsage);
    }

    const updated = await ticketService.renameTicket(ticket.ticketId, newName, ctx.member);
    const channel = await ctx.guild.channels.fetch(updated.channelId).catch(() => null);
    await ctx.replyWith(
      buildTicketNotice(
        [prefixMessages.ticket.renamed(channel && "name" in channel ? channel.name : newName)],
        { tone: "success" },
      ),
    );
  },
});
