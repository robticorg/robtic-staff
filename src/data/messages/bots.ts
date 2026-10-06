import { emojis } from "../emojis/index.ts";

const E = emojis;

export const botsMessages = {
  adminOnly: `${E.error} هذا الأمر للأدمن بس.`,
  none: `${E.warning} ما فيه ولا بوت في السيرفر.`,
  title: (count: number) => `## 🤖 بوتات السيرفر (${count})`,
  titlePage: (count: number, page: number, pages: number) => `## 🤖 بوتات السيرفر (${count}) — ${page}/${pages}`,
  row: (index: number, botId: string, tag: string, admin: boolean, joinedAt: number | null) =>
    [
      `**${index}.** <@${botId}> \`${tag}\``,
      `-# ID: \`${botId}\`${admin ? " · 🛡️ أدمن" : ""}${joinedAt ? ` · دخل <t:${Math.floor(joinedAt / 1000)}:R>` : ""}`,
    ].join("\n"),
  adminCount: (count: number) => `-# البوتات اللي معها صلاحية أدمن: **${count}**`,
} as const;
