import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { limits } from "../../../data/config/limits.ts";
import { sleep } from "../../../shared/utils/sleep.ts";
import { buildTicketNotice } from "../../../modules/tickets/render/notice.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";
import type { PrefixContext } from "../../../discord/prefix-command.ts";
import { modmailCaseService } from "../../../modules/modmail/services/modmail-case.service.ts";
import { modmailService } from "../../../modules/modmail/services/modmail.service.ts";
import { reportPermissionService } from "../../../modules/modmail/services/report-permissions.service.ts";
import { ModmailCaseStatus } from "../../../modules/modmail/types/enums.ts";

export default definePrefixCommand({
  name: "close",
  category: "ticket",
  async execute(ctx) {
    if (await closeReportThread(ctx)) return;

    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    await ctx.replyWith(
      buildTicketNotice(
        [ticketMessages.close.confirming(ticket.ticketId, limits.ticketCloseConfirmSeconds)],
        { tone: "warning" },
      ),
    );
    await sleep(limits.ticketCloseConfirmSeconds * 1000);

    const result = await ticketService.closeTicket(ticket.ticketId, ctx.member.id, panel, ctx.guild);
    await ticketService.recordCompletionCredit(result.ticket).catch(() => undefined);

    if (!result.deleted) {
      await ctx.replyWith(
        buildTicketNotice(
          [
            result.transcriptId
              ? prefixMessages.ticket.closedWithTranscript(ticket.ticketId, result.transcriptId)
              : prefixMessages.ticket.closed(ticket.ticketId),
          ],
          { tone: "success" },
        ),
      );
    }
  },
});

async function closeReportThread(ctx: PrefixContext): Promise<boolean> {
  if (!ctx.channel.isThread()) return false;

  const kase = await modmailCaseService.getByThreadId(ctx.channel.id);
  if (!kase || kase.guildId !== ctx.guild.id) return false;

  if (kase.status === ModmailCaseStatus.CLOSED) {
    throw new PrefixAbort(prefixMessages.modmail.alreadyClosed);
  }
  if (!(await reportPermissionService.canManageReport(ctx.member, kase))) {
    throw new PrefixAbort(prefixMessages.modmail.notAllowed);
  }

  await modmailService.closeAfterDecision(kase.caseId, ctx.member);
  await ctx.reply(prefixMessages.modmail.closed(kase.caseId));
  return true;
}
