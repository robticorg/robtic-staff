import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { performTicketTransfer } from "../../../modules/tickets/services/ticket-transfer-flow.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetMember } from "../_shared/target.ts";

const M = ticketMessages;

export default definePrefixCommand({
  name: "handover",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, ticket)) {
      throw new PrefixAbort(M.options.notAllowed);
    }

    const target = await requireTargetMember(ctx, M.transfer.usage);
    const reason = ctx.args
      .filter((arg) => !extractUserIds([arg]).includes(target.id))
      .join(" ")
      .trim()
      .slice(0, limits.reasonMaxLength);
    if (!reason) throw new PrefixAbort(M.transfer.reasonMissing);

    const outcome = await performTicketTransfer({
      ticketId: ticket.ticketId,
      actor: ctx.member,
      target,
      panel,
      reason,
    });

    await ctx.reply(outcome.reply);
  },
});
