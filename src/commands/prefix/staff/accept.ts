import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffManagementService } from "../../../modules/staff/services/staff-management.service.ts";
import { requireStaffManager } from "../_shared/guards.ts";
import { parseCount } from "../_shared/parse.ts";
import { requireTargetMember } from "../_shared/target.ts";

export default definePrefixCommand({
  name: "accept",
  category: "staff",
  async execute(ctx) {
    await requireStaffManager(ctx);
    const target = await requireTargetMember(ctx, "!accept @user [level]");

    const levelArg = ctx.args.find((a) => /^\d+$/.test(a));
    const level = parseCount(levelArg);

    const result = await staffManagementService.accept(target, ctx.member.id, level);
    await ctx.reply(prefixMessages.staff.accepted(`<@${target.id}>`, result.level));
  },
});
