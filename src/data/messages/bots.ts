import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const rel = (ms: number) => `<t:${Math.floor(ms / 1000)}:R>`;

export const botsMessages = bilingual(
  {
    adminOnly: `${E.error} Admins only.`,
    none: `${E.warning} There are no bots in the server.`,
    title: (count: number) => `## 🤖 Server bots (${count})`,
    titlePage: (count: number, page: number, pages: number) => `## 🤖 Server bots (${count}) — ${page}/${pages}`,
    row: (index: number, botId: string, tag: string, admin: boolean, joinedAt: number | null) =>
      [`**${index}.** <@${botId}> \`${tag}\``, `-# ID: \`${botId}\`${admin ? " · 🛡️ admin" : ""}${joinedAt ? ` · joined ${rel(joinedAt)}` : ""}`].join("\n"),
    adminCount: (count: number) => `-# Bots with admin: **${count}**`,
  },
  {
    adminOnly: `${E.error} للأدمن بس.`,
    none: `${E.warning} ما فيه بوتات في السيرفر.`,
    title: (count: number) => `## 🤖 بوتات السيرفر (${count})`,
    titlePage: (count: number, page: number, pages: number) => `## 🤖 بوتات السيرفر (${count}) — ${page}/${pages}`,
    row: (index: number, botId: string, tag: string, admin: boolean, joinedAt: number | null) =>
      [`**${index}.** <@${botId}> \`${tag}\``, `-# ID: \`${botId}\`${admin ? " · 🛡️ أدمن" : ""}${joinedAt ? ` · دخل ${rel(joinedAt)}` : ""}`].join("\n"),
    adminCount: (count: number) => `-# البوتات اللي معها أدمن: **${count}**`,
  },
);
