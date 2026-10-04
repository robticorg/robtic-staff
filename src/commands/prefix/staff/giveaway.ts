import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { hasAdminAccess } from "../../../modules/access/index.ts";
import { giveawayService } from "../../../modules/giveaways/index.ts";
import { parseMessageRef } from "../../../modules/giveaways/services/giveaway-message.ts";
import { PrefixAbort } from "../_shared/guards.ts";

const M = giveawayMessages.giveaway;

export default definePrefixCommand({
  name: "giveaway",
  category: "staff",
  async execute(ctx) {
    if (!hasAdminAccess(ctx.member)) throw new PrefixAbort(M.adminOnly);
    const ref = parseMessageRef(ctx.args[0]);
    if (!ref) throw new PrefixAbort(M.usage);

    const giveaway = await giveawayService.register({
      guild: ctx.guild,
      ref,
      channelId: ctx.channel.id,
      actorId: ctx.member.id,
    });
    await ctx.reply(M.registered(giveaway.channelId, giveaway.endsAt, giveaway.botId));
  },
});
