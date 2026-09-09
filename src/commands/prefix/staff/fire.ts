import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffManagementService } from "../../../modules/staff/services/staff-management.service.ts";
import { requireStaffManager } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";

const BLACKLIST_FLAGS = new Set(["blacklist", "bl", "=", "بلاك", "قائمة-سوداء"]);

export default definePrefixCommand({
  name: "fire",
  category: "staff",
  async execute(ctx) {
    await requireStaffManager(ctx);
    const target = await requireTargetMember(ctx, prefixMessages.staff.fireUsage);
    const blacklist = ctx.args.some((a) => BLACKLIST_FLAGS.has(a.toLowerCase()));

    await staffManagementService.fire(target, ctx.member.id, blacklist);
    await ctx.reply(
      blacklist
        ? prefixMessages.staff.blacklisted(`<@${target.id}>`)
        : prefixMessages.staff.fired(`<@${target.id}>`),
    );
  },
});
