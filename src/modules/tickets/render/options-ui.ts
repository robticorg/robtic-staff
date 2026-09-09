import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type InteractionReplyOptions,
} from "discord.js";
import { emojis } from "../../../data/emojis/index.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";

const M = ticketMessages.options;

export function buildTicketOptionsUi(ticketId: string): InteractionReplyOptions {
  return {
    content: M.title,
    flags: MessageFlags.Ephemeral,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TicketCustomId.optClose(ticketId))
          .setLabel(M.closeButton)
          .setEmoji(emojis.lock)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(TicketCustomId.optAddUser(ticketId))
          .setLabel(M.addUserButton)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(TicketCustomId.optRemoveUser(ticketId))
          .setLabel(M.removeUserButton)
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}
