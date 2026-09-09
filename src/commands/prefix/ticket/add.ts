import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";
import { extractRoleIds, extractUserIds } from "../_shared/parse.ts";

export default definePrefixCommand({
  name: "add",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, panel, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    const users = new Set([...ctx.mentionedUsers.map((u) => u.id), ...extractUserIds(ctx.args)]);
    const roles = new Set([...ctx.mentionedRoles.map((r) => r.id), ...extractRoleIds(ctx.args)]);
    for (const id of roles) users.delete(id);

    if (users.size === 0 && roles.size === 0) {
      throw new PrefixAbort(prefixMessages.ticket.nothingToAdd);
    }

    const result = await ticketService.addUser(ticket.ticketId, ctx.member, panel, {
      users: [...users],
      roles: [...roles],
    });
    await ctx.reply(prefixMessages.ticket.added(result.users, result.roles));
  },
});
