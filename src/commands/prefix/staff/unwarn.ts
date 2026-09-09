import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { warningActionService } from "../../../modules/warnings/services/warning-actions.service.ts";
import { PrefixAbort, requireStaff } from "../_shared/guards.ts";
import { requireTargetId } from "../_shared/target.ts";
import { textAfterTarget } from "../_shared/warn-config.ts";

export default definePrefixCommand({
  name: "unwarn",
  category: "staff",
  async execute(ctx) {
    await requireStaff(ctx);

    const targetId = requireTargetId(ctx, prefixMessages.warn.unwarnUsage);
    const remainder = textAfterTarget(ctx.rest).split(/\s+/).filter(Boolean);
    const warningId = remainder[0];
    if (!warningId) throw new PrefixAbort(prefixMessages.warn.unwarnUsage);
    const reason = remainder.slice(1).join(" ") || undefined;

    const result = await warningActionService.revokeWarning({
      guild: ctx.guild,
      warningId,
      targetId,
      actor: ctx.member,
      isStaffManager: await staffPermissionService.isStaffManager(ctx.member),
      reason,
    });

    const mention = `<@${targetId}>`;
    const reply =
      result.kind === "STAFF_VERBAL"
        ? prefixMessages.warn.unwarnedVerbal(mention)
        : result.kind === "STAFF_REAL"
          ? prefixMessages.warn.unwarnedReal(mention)
          : prefixMessages.warn.unwarnedUser(mention);
    await ctx.reply(reply);
  },
});
