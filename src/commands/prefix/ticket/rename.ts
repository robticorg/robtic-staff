import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

const NAME_PATTERN = /[a-z0-9]/i;

export default definePrefixCommand({
  name: "rename",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, panel, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    const newName = ctx.rest.trim();
    if (!newName || !NAME_PATTERN.test(newName)) {
      throw new PrefixAbort(prefixMessages.ticket.renameUsage);
    }

    const updated = await ticketService.renameTicket(ticket.ticketId, newName, ctx.member);
    const channel = await ctx.guild.channels.fetch(updated.channelId).catch(() => null);
    await ctx.reply(prefixMessages.ticket.renamed(channel && "name" in channel ? channel.name : newName));
  },
});
