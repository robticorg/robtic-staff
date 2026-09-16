import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type BaseMessageOptions,
} from "discord.js";
import { modmailMessages } from "../../../data/messages/modmail.ts";

const M = modmailMessages.transfer;

export interface ReportTransferDmInput {
  caseId: string;
  guildId: string;
  threadId: string;
  reason: string;
}

export function buildReportTransferDm(input: ReportTransferDmInput): BaseMessageOptions {
  return {
    content: M.dm.body(input.caseId, input.reason),
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(M.dm.button)
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${input.guildId}/${input.threadId}`),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}
