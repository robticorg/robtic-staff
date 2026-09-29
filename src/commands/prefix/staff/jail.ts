import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { moderationActionService } from "../../../modules/punishment/services/moderation-action.service.ts";
import {
  JAIL_MAX_MS,
  JAIL_MIN_MS,
  formatDuration,
  takeDurationToken,
} from "../../../modules/punishment/services/duration.service.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";
import { evidenceUrls, isProofExempt, textAfterTarget } from "../_shared/warn-config.ts";

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

    // "!jail @user spam 2h", "!jail @user 3d" — the time is optional; without it the jail is permanent.
    const { rest, durationMs } = takeDurationToken(textAfterTarget(ctx.rest));
    if (durationMs !== null && (durationMs < JAIL_MIN_MS || durationMs > JAIL_MAX_MS)) {
      throw new PrefixAbort(M.durationOutOfRange);
    }
    if (!rest && durationMs === null) throw new PrefixAbort(M.reasonRequired);
    const reason = rest || M.noReason;

    const evidence = evidenceUrls(ctx.message);
    if (evidence.length === 0 && !(await isProofExempt(ctx.member))) {
      throw new PrefixAbort(M.proofRequired);
    }

    const result = await moderationActionService.jail({
      guild: ctx.guild,
      target,
      actor: ctx.member,
      reason,
      evidence,
      ...(durationMs !== null ? { durationMs } : {}),
    });

    if (result.denied) throw new PrefixAbort(M.denied[result.denied]);
    if (!result.executed) {
      throw new PrefixAbort(M.failed(result.failureReason ?? ""));
    }

    const mention = `<@${target.id}>`;
    const until = result.punishment?.expiresAt;
    await ctx.reply(
      durationMs !== null && until
        ? M.jailedFor(mention, reason, formatDuration(durationMs), until)
        : M.jailed(mention, reason),
    );
  },
});
