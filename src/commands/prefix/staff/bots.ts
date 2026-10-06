import { PermissionFlagsBits } from "discord.js";
import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { botsMessages } from "../../../data/messages/bots.ts";
import { hasAdminAccess } from "../../../modules/access/index.ts";
import { buildBotListPages } from "../../../modules/server-bots/render/bot-list.ts";
import { PrefixAbort } from "../_shared/guards.ts";

const M = botsMessages;

export default definePrefixCommand({
  name: "bots",
  category: "staff",
  async execute(ctx) {
    if (!hasAdminAccess(ctx.member)) throw new PrefixAbort(M.adminOnly);

    const members = await ctx.guild.members.fetch();
    const bots = members
      .filter((m) => m.user.bot)
      .map((m) => ({
        id: m.id,
        tag: m.user.tag,
        admin: m.permissions.has(PermissionFlagsBits.Administrator),
        joinedAt: m.joinedTimestamp,
      }));
    if (bots.length === 0) throw new PrefixAbort(M.none);

    for (const content of buildBotListPages(bots)) {
      await ctx.reply(content);
    }
  },
});
