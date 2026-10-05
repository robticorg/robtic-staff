import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { HIDDEN_REMOVE_KEYWORDS } from "../../../data/hidden-staff/config.ts";
import { hiddenStaffMessages } from "../../../data/hidden-staff/messages.ts";
import { hiddenStaffAuthorizationService, hiddenStaffService } from "../../../modules/staff/hidden/index.ts";
import { buildHiddenLevelMenu } from "../../../modules/staff/hidden/render/level-menu.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";

const C = hiddenStaffMessages.command;

export function isHiddenRemoval(args: readonly string[]): boolean {
  return args.some((arg) => HIDDEN_REMOVE_KEYWORDS.has(arg.trim().toLowerCase()));
}

export default definePrefixCommand({
  name: "hidden",
  category: "staff",
  async execute(ctx) {
    if (!hiddenStaffAuthorizationService.isHiddenManager(ctx.member)) throw new PrefixAbort(C.notManager);
    const target = await requireTargetMember(ctx, C.usage);

    if (isHiddenRemoval(ctx.args)) {
      await hiddenStaffService.remove(ctx.member, target);
      await ctx.reply(C.removed(target.id));
      return;
    }

    const levels = await hiddenStaffService.levelOptions(ctx.member, target);
    await ctx.replyWith(buildHiddenLevelMenu(ctx.member.id, target.id, levels));
  },
});
