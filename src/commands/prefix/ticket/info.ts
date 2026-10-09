import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { LEGACY_TICKET_PREFIX, ticketPrefixes } from "../../../data/tickets/index.ts";
import { buildTicketInfoCard } from "../../../modules/tickets/render/ticket-info.ts";
import { ticketConfigService } from "../../../modules/tickets/services/ticket-config.service.ts";
import { memberIsAdministrator } from "../../../modules/tickets/services/ticket-permissions.ts";
import { ticketService } from "../../../modules/tickets/services/ticket.service.ts";
import { PrefixAbort, resolveTicketContext } from "../_shared/guards.ts";

const M = ticketMessages.info;

/**
 * Reads what the admin typed after !ticket:
 *   "12", "#12", "ticket-12"                 → the support ticket "ticket-12"
 *   "apply-3", "res-7", …                    → that ticket type's own number
 *   "<#channelId>", "channelId", channel link → that ticket channel
 */
export function parseTicketRef(
  raw: string | undefined,
  prefixes: readonly string[] = ticketPrefixes(),
): { ticketId: string } | { channelId: string } | null {
  const token = raw?.trim();
  if (!token) return null;
  const channel =
    /^<#(\d{17,20})>$/.exec(token) ??
    /^(\d{17,20})$/.exec(token) ??
    /channels\/\d{17,20}\/(\d{17,20})\/?$/.exec(token);
  if (channel) return { channelId: channel[1]! };
  const number = /^#?(\d{1,9})$/.exec(token);
  if (number) return { ticketId: `${LEGACY_TICKET_PREFIX}-${Number(number[1])}` };
  const prefixed = /^([a-z]+)-(\d{1,9})$/i.exec(token);
  if (prefixed && prefixes.includes(prefixed[1]!.toLowerCase())) {
    return { ticketId: `${prefixed[1]!.toLowerCase()}-${Number(prefixed[2])}` };
  }
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
        : await ticketService.getTicketByName(ctx.guild.id, ref.ticketId);
    if (!ticket || ticket.guildId !== ctx.guild.id) {
      throw new PrefixAbort(M.notFound(ctx.args[0]));
    }

    const panelName = ticketConfigService.getPanel(ticket.panelId, ticket.guildId)?.name ?? ticket.panelId;
    await ctx.replyWith(buildTicketInfoCard(ticket, panelName));
  },
});
