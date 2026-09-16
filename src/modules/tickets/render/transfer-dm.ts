import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { ticketMessages } from "../../../data/messages/tickets.ts";

const M = ticketMessages.transfer;

export interface TransferDmInput {
  ticketId: string;
  guildId: string;
  channelId: string;
  reason: string;
}

/** Plain text (no embed) plus one link button straight into the ticket channel. */
export function buildTransferDm(input: TransferDmInput): BaseMessageOptions {
  return {
    content: M.dm.body(input.ticketId, input.reason),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(M.dm.button)
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${input.guildId}/${input.channelId}`),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}
