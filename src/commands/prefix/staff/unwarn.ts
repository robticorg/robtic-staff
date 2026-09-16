import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffService } from "../../../modules/staff/index.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { staffWarningService } from "../../../modules/warnings/index.ts";
import { classifyWarnChannel } from "../../../modules/warnings/services/warn-channels.ts";
import {
  resolveWarningCategory,
  warningActionService,
} from "../../../modules/warnings/services/warning-actions.service.ts";
import { staffManagementAuthorizationService } from "../../../modules/staff/services/staff-management-authorization.service.ts";
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

      const reply =
        result.kind === "STAFF_VERBAL"
          ? M.unwarnedVerbal(mention)
          : result.kind === "STAFF_REAL"
            ? M.unwarnedReal(mention)
            : M.unwarnedUser(mention);
      await ctx.reply(reply);
      return;
    }

    // Whoever may warn this member may also lift that warning — same tiers,
    // same boundaries, one decision point.
    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) throw new PrefixAbort(prefixMessages.staff.memberNotFound);

    const decision = await staffManagementAuthorizationService.canWarn(ctx.member, targetMember);
    if (!decision.allowed) throw new PrefixAbort(decision.message);

    const targetStaff = await staffService.get(targetId, ctx.guild.id);
    if (!targetStaff) throw new PrefixAbort(M.staffWarnTargetNotStaff(mention));

    // Scoped to the ladder the member is on now, so `!unwarn` on an Owner lifts
    // an Owner warning and never reaches into their normal staff history.
    const category = await resolveWarningCategory(targetMember);
    const activeReal = await staffWarningService.activeRealForStaff(targetStaff._id, category);
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
