import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { staffMessages } from "../../../data/messages/staff.ts";

const M = staffMessages.come;

export interface ComeDmInput {
  callerId: string;
  reason: string;
  guildId: string;
  channelId: string;
  /** The `!come` message itself — the button jumps straight to it. */
  messageId: string;
}

/** Plain text plus a link button to where the call was made — no embed. */
export function buildComeDm(input: ComeDmInput): BaseMessageOptions {
  return {
    content: M.dm.body(input.callerId, input.reason),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(M.dm.button)
          .setStyle(ButtonStyle.Link)
          .setURL(
            `https://discord.com/channels/${input.guildId}/${input.channelId}/${input.messageId}`,
          ),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}
