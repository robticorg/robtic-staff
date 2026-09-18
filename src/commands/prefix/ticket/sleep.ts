import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { buildTicketNotice } from "../../../modules/tickets/render/notice.ts";
import {
  resolveSleepDuration,
  ticketSleepService,
} from "../../../modules/tickets/services/ticket-sleep.service.ts";
import { resolveTicketContext } from "../_shared/guards.ts";

const M = ticketMessages.sleep;

export default definePrefixCommand({
  name: "sleep",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    const durationMs = resolveSleepDuration(ctx.args[0]);

    const result = await ticketSleepService.startSleep({
      ticketId: ticket.ticketId,
      actor: ctx.member,
      panel,
      durationMs,
    });

    await ctx.replyWith(
      buildTicketNotice(
        [
          M.started(result.duration, result.dueAt),
          result.dmDelivered ? null : M.dmFailed(ticket.userId),
        ],
        { tone: "success" },
      ),
    );

    await ctx.channel
      .send(
        buildTicketNotice([M.channelNote(ticket.userId, result.duration)], {
          tone: "info",
          mentions: [ticket.userId],
        }),
      )
      .catch(() => undefined);
  },
});
