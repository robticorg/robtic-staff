import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";

const M = ticketMessages.memberLeft;

/**
 * Posted in a ticket when its owner leaves the server. The button is the ticket's
 * normal close button, so it closes the same way (same permission, countdown and
 * transcript) as !close. The claimer is pinged so they notice.
 */
export function buildMemberLeftNotice(ticket: {
  ticketId: string;
  userId: string;
  claimedByDiscordId?: string | null;
}): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.warning);
  container.addTextDisplayComponents((t) => t.setContent(M.title(ticket.userId)));
  container.addTextDisplayComponents((t) => t.setContent(M.question));
  if (ticket.claimedByDiscordId) {
    container.addTextDisplayComponents((t) => t.setContent(M.claimerPing(ticket.claimedByDiscordId!)));
  }
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(TicketCustomId.optClose(ticket.ticketId))
        .setLabel(M.closeButton)
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    // Only the claimer is pinged — the member who left can't be anyway.
    allowedMentions: ticket.claimedByDiscordId ? { users: [ticket.claimedByDiscordId] } : { parse: [] },
  } as BaseMessageOptions;
}
