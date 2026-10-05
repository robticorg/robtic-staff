import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import { buildManageCard } from "../../../modules/responsibilities/render/manage.ts";
import { buildRemoveMenu } from "../../../modules/responsibilities/render/menus.ts";
import {
  responsibilityAssignmentService,
  responsibilityAuthorizationService,
} from "../../../modules/responsibilities/index.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { parseResponsibleArgs } from "../_shared/responsible-args.ts";

const M = responsibilityMessages;

export default definePrefixCommand({
  name: "responsible",
  category: "staff",
  async execute(ctx) {
    if (!(await responsibilityAuthorizationService.canManageAny(ctx.member))) {
      throw new PrefixAbort(M.errors.notAllowedAny);
    }
    const { remove, targetId } = parseResponsibleArgs(ctx.args);
    if (!targetId) throw new PrefixAbort(M.errors.usage);

    const target = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!target) throw new PrefixAbort(M.errors.targetGone);
    if (target.user.bot) throw new PrefixAbort(M.errors.targetBot);

    if (remove) {
      const active = await responsibilityAssignmentService.getActiveResponsibilities(ctx.guild.id, target.id);
      if (active.length === 0) throw new PrefixAbort(M.remove.none);
      const removable = await responsibilityAssignmentService.removableFor(ctx.guild, ctx.member, target.id);
      if (removable.length === 0) throw new PrefixAbort(M.remove.nothingYouCanRemove);
      await ctx.replyWith(
        buildRemoveMenu(
          ctx.member.id,
          target.id,
          removable.map((row) => ({ assignmentId: row.assignment.assignmentId, responsibility: row.responsibility })),
        ),
      );
      return;
    }

    await ctx.replyWith(buildManageCard(ctx.member.id, target.id));
  },
});
