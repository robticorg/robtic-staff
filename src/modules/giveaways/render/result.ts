import { ContainerBuilder, MessageFlags, type MessageReplyOptions } from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";

const R = giveawayMessages.result;

export interface WinnerCheck {
  userId: string;
  provedBy: string | null;
}

export function giveawayResultLines(winners: readonly WinnerCheck[], proofCount: number): string[] {
  return [
    R.title,
    ...winners.map((w) => (w.provedBy ? R.proved(w.userId, w.provedBy) : R.notProved(w.userId))),
    R.footer(proofCount),
  ];
}

export function buildGiveawayResult(winners: readonly WinnerCheck[], proofCount: number): MessageReplyOptions {
  const allProved = winners.every((w) => w.provedBy);
  const container = new ContainerBuilder().setAccentColor(allProved ? colors.success : colors.error);
  container.addTextDisplayComponents((t) => t.setContent(giveawayResultLines(winners, proofCount).join("\n")));
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [], repliedUser: false },
  };
}
