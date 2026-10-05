import type { MessageReplyOptions } from "discord.js";
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
  return {
    content: giveawayResultLines(winners, proofCount).join("\n"),
    allowedMentions: { parse: [], repliedUser: false },
  };
}
