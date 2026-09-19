import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { moderationActionService } from "../../../modules/punishment/services/moderation-action.service.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetId } from "../_shared/target.ts";
import { textAfterTarget } from "../_shared/warn-config.ts";

const M = prefixMessages.unjail;

export default definePrefixCommand({
  name: "unjail",
  category: "staff",
  async execute(ctx) {
    if (!(await staffPermissionService.canActAsStaff(ctx.member))) {
      throw new PrefixAbort(prefixMessages.common.notStaff);
    }

    // Resolved by id, not as a member — someone jailed out of the guild still has
    // a record to lift, and refusing that would strand it as permanently active.
    const targetId = requireTargetId(ctx, M.usage);
    const target =
      ctx.guild.members.cache.get(targetId) ??
      (await ctx.guild.members.fetch(targetId).catch(() => null));

    const reason = textAfterTarget(ctx.rest) || M.defaultReason(ctx.member.id);
    const mention = `<@${targetId}>`;

    const result = await moderationActionService.unjail({
      guild: ctx.guild,
      target,
      targetId,
      actorId: ctx.member.id,
      reason,
    });

    if (result.outcome === "not-jailed") throw new PrefixAbort(M.notJailed(mention));

    if (result.outcome === "role-removed") {
      await ctx.reply(M.releasedRoleOnly(mention));
      return;
    }

    if (result.discordReversed === false) {
      await ctx.reply(M.roleRemoveFailed(mention, result.reversalError ?? ""));
      return;
    }

    await ctx.reply(M.released(mention));
  },
});
