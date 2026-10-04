import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { giveawayMessages } from "../../../data/giveaways/messages.ts";
import { giveawayService } from "../../../modules/giveaways/index.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetId } from "../_shared/target.ts";

const M = giveawayMessages.done;
const SNOWFLAKE = /^\d{17,20}$/;

export function doneMessageIdArg(args: readonly string[], targetId: string): string | null {
  for (const arg of args) {
    if (extractUserIds([arg]).includes(targetId)) continue;
    const id = arg.trim().split("/").at(-1) ?? "";
    if (SNOWFLAKE.test(id)) return id;
  }
  return null;
}

export default definePrefixCommand({
  name: "done",
  category: "staff",
  async execute(ctx) {
    const targetId = ctx.mentionedUsers[0]?.id ?? extractUserIds(ctx.args)[0] ?? null;
    const giveaway = await giveawayService.target(
      ctx.guild.id,
      targetId ? doneMessageIdArg(ctx.args, targetId) : null,
    );
    if (!giveaway) throw new PrefixAbort();

    if (!(await staffPermissionService.canActAsStaff(ctx.member))) throw new PrefixAbort(M.notStaff);
    const userId = requireTargetId(ctx, M.usage);
    if (ctx.mentionedUsers[0]?.bot) throw new PrefixAbort(M.bot);

    const saved = await giveawayService.markDone(giveaway, userId, ctx.member.id);
    await ctx.reply(saved ? M.saved(userId, giveaway.channelId, giveaway.endsAt) : M.alreadySaved(userId));
  },
});
