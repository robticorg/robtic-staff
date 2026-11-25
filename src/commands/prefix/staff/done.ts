import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { giveawayService } from "../../../modules/giveaways/index.ts";
import { buildGiveawayPickMenu } from "../../../modules/giveaways/render/pick-menu.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";

const M = giveawayMessages.done;
const SNOWFLAKE = /^\d{17,20}$/;
const MENTION = /^<@!?(\d{17,20})>$/;

export interface DoneArgs {
  mentionedId: string | null;
  messageId: string | null;
}

export function parseDoneArgs(args: readonly string[]): DoneArgs {
  let mentionedId: string | null = null;
  let messageId: string | null = null;
  for (const raw of args) {
    const arg = raw.trim();
    const mention = MENTION.exec(arg);
    if (mention && !mentionedId) {
      mentionedId = mention[1]!;
      continue;
    }
    const id = arg.split("/").at(-1) ?? "";
    if (SNOWFLAKE.test(id) && !messageId) messageId = id;
  }
  return { mentionedId, messageId };
}

export default definePrefixCommand({
  name: "done",
  category: "staff",
  async execute(ctx) {
    const { mentionedId, messageId } = parseDoneArgs(ctx.args);
    const explicit = messageId ? await giveawayService.target(ctx.guild.id, messageId) : null;
    const active = explicit ? [explicit] : await giveawayService.listActive(ctx.guild.id);
    if (active.length === 0) throw new PrefixAbort();

    if (!(await staffPermissionService.canActAsStaff(ctx.member))) throw new PrefixAbort(M.notStaff);

    const userId = mentionedId;
    if (!userId) throw new PrefixAbort(M.usage);

    const target = await ctx.guild.members.fetch(userId).catch(() => null);
    if (target?.user.bot) throw new PrefixAbort(M.bot);

    if (active.length === 1) {
      const giveaway = active[0]!;
      const saved = await giveawayService.markDone(giveaway, userId, ctx.member.id);
      await ctx.reply(saved ? M.saved(userId, giveaway.channelId, giveaway.endsAt) : M.alreadySaved(userId));
      return;
    }

    await ctx.replyWith(
      buildGiveawayPickMenu(
        ctx.member.id,
        userId,
        active.map((giveaway) => ({
          giveawayId: giveaway.giveawayId,
          title: giveaway.title ?? null,
          channelName: ctx.guild.channels.cache.get(giveaway.channelId)?.name ?? null,
          endsAt: giveaway.endsAt,
        })),
      ),
    );
  },
});
