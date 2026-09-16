import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffService } from "../../../modules/staff/index.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { staffWarningService } from "../../../modules/warnings/index.ts";
import { classifyWarnChannel } from "../../../modules/warnings/services/warn-channels.ts";
import { warningActionService } from "../../../modules/warnings/services/warning-actions.service.ts";
import { PrefixAbort, requireStaff } from "../_shared/guards.ts";
import { requireTargetId } from "../_shared/target.ts";
import { loadWarnChannels, textAfterTarget } from "../_shared/warn-config.ts";

const M = prefixMessages.warn;

export default definePrefixCommand({
  name: "unwarn",
  category: "staff",
  async execute(ctx) {
    const kind = classifyWarnChannel(ctx.channel.id, await loadWarnChannels(ctx.guild.id));
    if (kind === null) throw new PrefixAbort();

    const targetId = requireTargetId(ctx, M.unwarnUsage);
    const mention = `<@${targetId}>`;

    if (kind === "USER") {
      await requireStaff(ctx);

      const remainder = textAfterTarget(ctx.rest).split(/\s+/).filter(Boolean);
      const warningId = remainder[0];
      if (!warningId) throw new PrefixAbort(M.unwarnWarningIdRequired);
      const reason = remainder.slice(1).join(" ") || undefined;

      const result = await warningActionService.revokeWarning({
        guild: ctx.guild,
        warningId,
        targetId,
        actor: ctx.member,
        isStaffManager: await staffPermissionService.isStaffManager(ctx.member),
        reason,
      });
      // The id could name a staff warning even from the member-warns channel —
      // reply with the kind that was actually removed, not the channel's kind.
      const reply =
        result.kind === "STAFF_VERBAL"
          ? M.unwarnedVerbal(mention)
          : result.kind === "STAFF_REAL"
            ? M.unwarnedReal(mention)
            : M.unwarnedUser(mention);
      await ctx.reply(reply);
      return;
    }

    // STAFF channel — manager-only, no warning id: removes the highest active
    // REAL warning (the one carrying the current warn role), in order.
    if (!(await staffPermissionService.isStaffManager(ctx.member))) {
      throw new PrefixAbort(M.staffWarnManagerOnly);
    }

    const targetStaff = await staffService.get(targetId, ctx.guild.id);
    if (!targetStaff) throw new PrefixAbort(M.staffWarnTargetNotStaff(mention));

    const activeReal = await staffWarningService.activeRealForStaff(targetStaff._id);
    const latest = activeReal.at(-1);
    if (!latest) throw new PrefixAbort(M.noActiveRealWarning(mention));

    const reason = textAfterTarget(ctx.rest) || undefined;

    await warningActionService.revokeWarning({
      guild: ctx.guild,
      warningId: latest._id.toString(),
      targetId,
      actor: ctx.member,
      isStaffManager: true,
      reason,
    });
    await ctx.reply(M.unwarnedReal(mention));
  },
});
