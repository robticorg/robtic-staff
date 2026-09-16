import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { limits } from "../../../data/config/limits.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { buildComeDm } from "../../../modules/staff/render/come-dm.ts";
import { PrefixAbort, requireStaff } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";
import { extractUserIds } from "../_shared/parse.ts";

const log = logger.child("prefix:come");
const M = staffMessages.come;

export default definePrefixCommand({
  name: "come",
  category: "staff",
  async execute(ctx) {
    await requireStaff(ctx);
    const target = await requireTargetMember(ctx, M.usage);

    const reason = ctx.args
      .filter((arg) => !extractUserIds([arg]).includes(target.id))
      .join(" ")
      .trim()
      .slice(0, limits.reasonMaxLength);

    if (!reason) throw new PrefixAbort(M.reasonRequired);
    if (target.id === ctx.member.id) throw new PrefixAbort(M.self);
    if (target.user.bot) throw new PrefixAbort(M.bot);

    try {
      await target.send(
        buildComeDm({
          callerId: ctx.member.id,
          reason,
          guildId: ctx.guild.id,
          channelId: ctx.channel.id,
          messageId: ctx.message.id,
        }),
      );
    } catch (err) {
      log.warn(`come DM to ${target.id} failed`, err);
      throw new PrefixAbort(M.dmFailed(`<@${target.id}>`));
    }

    await ctx.reply(M.sent(`<@${target.id}>`));
  },
});
