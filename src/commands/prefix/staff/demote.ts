import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffManagementService } from "../../../modules/staff/services/staff-management.service.ts";
import { requireStaffManager } from "../_shared/guards.ts";
import { parseCount } from "../_shared/parse.ts";
import { requireTargetMember } from "../_shared/target.ts";

export default definePrefixCommand({
  name: "demote",
  category: "staff",
  async execute(ctx) {
    await requireStaffManager(ctx);
    const target = await requireTargetMember(ctx, "!demote @user [levels]");
    const amount = parseCount(ctx.args.find((a) => /^\d+$/.test(a)));

    const result = await staffManagementService.demote(target, ctx.member.id, amount);
    await ctx.reply(
      result.changed
        ? prefixMessages.staff.demoted(`<@${target.id}>`, result.from, result.to)
        : prefixMessages.staff.alreadyMinLevel(`<@${target.id}>`),
    );
  },
});
