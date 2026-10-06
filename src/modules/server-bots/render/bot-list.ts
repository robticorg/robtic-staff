import { botsMessages } from "../../../data/messages/bots.ts";

const M = botsMessages;
const MAX_LENGTH = 1900;

export interface BotEntry {
  id: string;
  tag: string;
  admin: boolean;
  joinedAt: number | null;
}

export function sortBots(bots: readonly BotEntry[]): BotEntry[] {
  return [...bots].sort((a, b) => Number(b.admin) - Number(a.admin) || (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
}

export function buildBotListPages(bots: readonly BotEntry[]): string[] {
  const sorted = sortBots(bots);
  const rows = sorted.map((bot, i) => M.row(i + 1, bot.id, bot.tag, bot.admin, bot.joinedAt));
  const footer = M.adminCount(sorted.filter((b) => b.admin).length);

  const chunks: string[][] = [[]];
  let length = 0;
  for (const row of rows) {
    if (length + row.length + 2 > MAX_LENGTH && chunks[chunks.length - 1]!.length > 0) {
      chunks.push([]);
      length = 0;
    }
    chunks[chunks.length - 1]!.push(row);
    length += row.length + 2;
  }

  return chunks.map((chunk, i) => {
    const title = chunks.length > 1 ? M.titlePage(sorted.length, i + 1, chunks.length) : M.title(sorted.length);
    const parts = [title, chunk.join("\n\n")];
    if (i === chunks.length - 1) parts.push(footer);
    return parts.join("\n\n");
  });
}
