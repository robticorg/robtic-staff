import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import {
  resolveSleepDuration,
  ticketSleepService,
} from "../../../modules/tickets/services/ticket-sleep.service.ts";
import { resolveTicketContext } from "../_shared/guards.ts";

const M = ticketMessages.sleep;

/**
 * `!sleep [duration]` — mark the ticket as waiting on its opener. All the rules
 * (who may, what it does, when it closes) live in TicketSleepService.
 */
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

    const lines = [
      M.started(result.duration, result.dueAt),
      result.dmDelivered ? null : M.dmFailed(ticket.userId),
    ].filter((line): line is string => line !== null);

    await ctx.reply(lines.join("\n"));

    // Visible in the channel too, so the opener sees it even with DMs closed.
    await ctx.channel
      .send({
        content: M.channelNote(ticket.userId, result.duration),
        allowedMentions: { users: [ticket.userId] },
      })
      .catch(() => undefined);
  },
});
