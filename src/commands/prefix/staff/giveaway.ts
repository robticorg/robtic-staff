import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { hasAdminAccess } from "../../../modules/access/index.ts";
import { giveawayService } from "../../../modules/giveaways/index.ts";
import { PrefixAbort } from "../_shared/guards.ts";

const M = giveawayMessages.giveaway;
const SNOWFLAKE = /^\d{17,20}$/;

export function giveawayMessageIdArg(args: readonly string[]): string | null {
  const raw = args[0]?.trim() ?? "";
  const fromLink = raw.split("/").at(-1) ?? "";
  return SNOWFLAKE.test(fromLink) ? fromLink : null;
}

export default definePrefixCommand({
  name: "giveaway",
  category: "staff",
  async execute(ctx) {
    if (!hasAdminAccess(ctx.member)) throw new PrefixAbort(M.adminOnly);
    const messageId = giveawayMessageIdArg(ctx.args);
    if (!messageId) throw new PrefixAbort(M.usage);

    const giveaway = await giveawayService.register({
      guild: ctx.guild,
      messageId,
      channelId: ctx.channel.id,
      actorId: ctx.member.id,
    });
    await ctx.reply(M.registered(giveaway.channelId, giveaway.endsAt, giveaway.botId));
  },
});
