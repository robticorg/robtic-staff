import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { staffManagementAuthorizationService } from "../../../modules/staff/services/staff-management-authorization.service.ts";
import { classifyWarnChannel } from "../../../modules/warnings/services/warn-channels.ts";
import { warningActionService } from "../../../modules/warnings/services/warning-actions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";
import {
  evidenceUrls,
  loadWarnChannels,
  splitVerbalMarker,
  textAfterTarget,
} from "../_shared/warn-config.ts";

export default definePrefixCommand({
  name: "warn",
  category: "staff",
  async execute(ctx) {
    const kind = classifyWarnChannel(ctx.channel.id, await loadWarnChannels(ctx.guild.id));

    if (kind === null) throw new PrefixAbort();

    if (!(await staffPermissionService.canActAsStaff(ctx.member))) {
      throw new PrefixAbort(prefixMessages.common.notStaff);
    }

    const target = await requireTargetMember(ctx, prefixMessages.warn.userWarnUsage);
    const rawReason = textAfterTarget(ctx.rest);
    const evidence = evidenceUrls(ctx.message);

    if (kind === "USER") {
      if (!rawReason) throw new PrefixAbort(prefixMessages.warn.reasonRequired);
      await warningActionService.issueUserWarning({
        guildId: ctx.guild.id,
        targetId: target.id,
        reason: rawReason,
        issuer: ctx.member,
        evidence,
      });
      await ctx.reply(prefixMessages.warn.userWarned(`<@${target.id}>`, rawReason));
      return;
    }

    // §Warnings — one central decision. It also picks nothing: the category is
    // derived from the target's tier further down, never from the actor.
    const decision = await staffManagementAuthorizationService.canWarn(ctx.member, target);
    if (!decision.allowed) throw new PrefixAbort(decision.message);

    const { reason, isVerbal } = splitVerbalMarker(rawReason);
    if (!reason) throw new PrefixAbort(prefixMessages.warn.reasonRequired);
    if (evidence.length === 0) throw new PrefixAbort(prefixMessages.warn.proofRequired);

    const mention = `<@${target.id}>`;

    if (!isVerbal) {
      const result = await warningActionService.issueDirectRealStaffWarning({
        guild: ctx.guild,
        target,
        reason,
        issuer: ctx.member,
        evidence,
      });
      const lines = [prefixMessages.warn.realRecorded(mention, result.level)];
      if (result.fired) lines.push(prefixMessages.warn.firedMaxWarnings(mention));
      await ctx.reply(lines.join("\n"));
      return;
    }

    const result = await warningActionService.issueVerbalStaffWarning({
      guild: ctx.guild,
      target,
      reason,
      issuer: ctx.member,
      evidence,
    });

    const lines = [prefixMessages.warn.verbalRecorded(mention, reason)];
    if (result.escalation) {
      lines.push(prefixMessages.warn.convertedToReal(result.escalation.convertedVerbalCount));
      lines.push(prefixMessages.warn.realRecorded(mention, result.escalation.level));
      if (result.escalation.fired) {
        lines.push(prefixMessages.warn.firedMaxWarnings(mention));
      }
    }
    await ctx.reply(lines.join("\n"));
  },
});
