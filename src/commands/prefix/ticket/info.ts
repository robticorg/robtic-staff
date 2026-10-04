import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { buildTicketInfoCard } from "../../../modules/tickets/render/ticket-info.ts";
import { ticketConfigService } from "../../../modules/tickets/services/ticket-config.service.ts";
import { memberIsAdministrator } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

const M = ticketMessages.info;

/**
 * Reads what the admin typed after !ticket:
 *   "12", "#12", "ticket-12"                 → the ticket id "ticket-12"
 *   "<#channelId>", "channelId", channel link → that ticket channel
 */
export function parseTicketRef(raw: string | undefined): { ticketId: string } | { channelId: string } | null {
  const token = raw?.trim();
  if (!token) return null;
  const channel =
    /^<#(\d{17,20})>$/.exec(token) ??
    /^(\d{17,20})$/.exec(token) ??
    /channels\/\d{17,20}\/(\d{17,20})\/?$/.exec(token);
  if (channel) return { channelId: channel[1]! };
  const number = /^(?:ticket-|#)?(\d{1,9})$/i.exec(token);
  if (number) return { ticketId: `ticket-${Number(number[1])}` };
  return null;
}

/** !ticket [number] — everything about a ticket, for administrators only. */
export default definePrefixCommand({
  name: "ticket",
  category: "ticket",
  async execute(ctx) {
    const ref = parseTicketRef(ctx.args[0]);

    // No number: the ticket you're in (silent anywhere else, like every ticket command).
    if (!ctx.args[0]) {
      const { ticket, panel } = await resolveTicketContext(ctx, { allowClosed: true });
      if (!memberIsAdministrator(ctx.member)) throw new PrefixAbort(M.adminOnly);
      await ctx.replyWith(buildTicketInfoCard(ticket, panel.name));
      return;
    }

    // With a number it works from any channel — admins only.
    if (!memberIsAdministrator(ctx.member)) throw new PrefixAbort(M.adminOnly);
    if (!ref) throw new PrefixAbort(M.usage);

    const ticket =
      "channelId" in ref
        ? await ticketService.getTicketByChannel(ref.channelId)
        : await ticketService.getTicket(ref.ticketId);
    if (!ticket || ticket.guildId !== ctx.guild.id) {
      throw new PrefixAbort(M.notFound(ctx.args[0]));
    }

    const panelName = ticketConfigService.getPanel(ticket.panelId)?.name ?? ticket.panelId;
    await ctx.replyWith(buildTicketInfoCard(ticket, panelName));
  },
});
