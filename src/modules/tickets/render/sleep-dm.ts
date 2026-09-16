import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { ticketMessages } from "../../../data/messages/tickets.ts";

const M = ticketMessages.sleep;

export interface SleepDmInput {
  guildId: string;
  channelId: string;

  duration: string;
}

export function buildSleepDm(input: SleepDmInput): BaseMessageOptions {
  return {
    content: M.dm.body(input.duration),
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
