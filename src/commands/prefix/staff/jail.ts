import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { moderationActionService } from "../../../modules/punishment/services/moderation-action.service.ts";
import {
  JAIL_DEFAULT_MS,
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

    // "!jail @user spam 2h", "!jail @user 3d", "!jail @user" — no time means 28 days.
    const { rest, durationMs: givenMs } = takeDurationToken(textAfterTarget(ctx.rest));
    if (givenMs !== null && (givenMs < JAIL_MIN_MS || givenMs > JAIL_MAX_MS)) {
      throw new PrefixAbort(M.durationOutOfRange);
    }
    const durationMs = givenMs ?? JAIL_DEFAULT_MS;

    // Administrators and Ship+ jail on the spot: no reason, no proof.
    const exempt = await isProofExempt(ctx.member);
    if (!rest && givenMs === null && !exempt) throw new PrefixAbort(M.reasonRequired);
    const reason = rest || M.noReason;

    const evidence = evidenceUrls(ctx.message);
    if (evidence.length === 0 && !exempt) throw new PrefixAbort(M.proofRequired);

    const result = await moderationActionService.jail({
      guild: ctx.guild,
      target,
      actor: ctx.member,
      reason,
      evidence,
      durationMs,
    });

    if (result.denied) throw new PrefixAbort(M.denied[result.denied]);
    if (!result.executed) {
      throw new PrefixAbort(M.failed(result.failureReason ?? ""));
    }

    const mention = `<@${target.id}>`;
    const until = result.punishment?.expiresAt;
    await ctx.reply(
      until
        ? M.jailedFor(mention, reason, formatDuration(durationMs), until)
        : M.jailed(mention, reason),
    );
  },
});
