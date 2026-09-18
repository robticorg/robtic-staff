import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
  type BaseMessageOptions,
} from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { emojis } from "../../../data/emojis/index.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { Ticket } from "../models/ticket.model.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";
import { v2MessageOptions } from "./v2.ts";

const P = ticketMessages.closedPanel;

/**
 * Left in the channel when a panel closes tickets without deleting them, so the
 * staff who can still see the channel have somewhere to act from.
 */
export function buildClosedTicketPanel(
  ticket: Pick<
    Ticket,
    "ticketId" | "userId" | "claimedByDiscordId" | "closedBy" | "closedAt" | "transcriptId"
  >,
): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.neutral);

  container.addTextDisplayComponents((t) => t.setContent(P.heading(ticket.ticketId)));

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );

  container.addTextDisplayComponents((t) => t.setContent(P.owner(ticket.userId)));
  container.addTextDisplayComponents((t) =>
    t.setContent(
      ticket.claimedByDiscordId ? P.handler(ticket.claimedByDiscordId) : P.handlerNone,
    ),
  );
  if (ticket.closedBy) {
    container.addTextDisplayComponents((t) => t.setContent(P.closedBy(ticket.closedBy!)));
  }
  if (ticket.closedAt) {
    container.addTextDisplayComponents((t) => t.setContent(P.closedAt(ticket.closedAt!)));
  }
  container.addTextDisplayComponents((t) =>
    t.setContent(
      ticket.transcriptId ? P.transcriptSaved(ticket.transcriptId) : P.transcriptNone,
    ),
  );

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  );
  container.addTextDisplayComponents((t) => t.setContent(P.hint));

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(TicketCustomId.closedTranscript(ticket.ticketId))
        .setLabel(P.buttons.transcript)
        .setEmoji(emojis.note)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(TicketCustomId.closedReopen(ticket.ticketId))
        .setLabel(P.buttons.reopen)
        .setEmoji(emojis.success)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(TicketCustomId.closedDelete(ticket.ticketId))
        .setLabel(P.buttons.delete)
        .setStyle(ButtonStyle.Danger),
    ),
  );

  return {
    ...v2MessageOptions(container),
    allowedMentions: { parse: [] as never[] },
  };
}
