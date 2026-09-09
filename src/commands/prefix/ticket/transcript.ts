import type { GuildTextBasedChannel } from "discord.js";
import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { canManageTicket } from "../../../modules/tickets/services/ticket-permissions.ts";
import { transcriptService } from "../../../modules/tickets/services/transcript.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "transcript",
  category: "ticket",
  async execute(ctx) {
    const { ticket, panel } = await resolveTicketContext(ctx);
    if (!canManageTicket(ctx.member, panel, ticket)) {
      throw new PrefixAbort(prefixMessages.ticket.notAllowed);
    }

    const channel = ctx.channel.isTextBased() ? (ctx.channel as GuildTextBasedChannel) : null;
    const transcript = await transcriptService.generate(ticket, channel);
    await ctx.reply(prefixMessages.ticket.transcriptSaved(transcript.transcriptId));
  },
});
