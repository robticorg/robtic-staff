import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { moderationActionService } from "../../../modules/punishment/services/moderation-action.service.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";
import { evidenceUrls, textAfterTarget } from "../_shared/warn-config.ts";

const M = prefixMessages.jail;

export default definePrefixCommand({
  name: "jail",
  category: "staff",
  async execute(ctx) {
    if (!(await staffPermissionService.canActAsStaff(ctx.member))) {
      throw new PrefixAbort(prefixMessages.common.notStaff);
    }

    const target = await requireTargetMember(ctx, M.usage);
    if (target.id === ctx.member.id) throw new PrefixAbort(M.self);
    if (target.user.bot) throw new PrefixAbort(M.bot);

    const reason = textAfterTarget(ctx.rest);
    if (!reason) throw new PrefixAbort(M.reasonRequired);

    const evidence = evidenceUrls(ctx.message);
    if (evidence.length === 0) throw new PrefixAbort(M.proofRequired);

    const result = await moderationActionService.jail({
      guild: ctx.guild,
      target,
      actorId: ctx.member.id,
      reason,
      evidence,
    });

    if (!result.executed) {
      throw new PrefixAbort(M.failed(result.failureReason ?? ""));
    }

    await ctx.reply(M.jailed(`<@${target.id}>`, reason));
  },
});
