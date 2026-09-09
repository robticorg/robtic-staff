import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { classifyWarnChannel } from "../../../modules/warnings/services/warn-channels.ts";
import { warningActionService } from "../../../modules/warnings/services/warning-actions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";
import { evidenceUrls, loadWarnChannels, textAfterTarget } from "../_shared/warn-config.ts";

export default definePrefixCommand({
  name: "warn",
  category: "staff",
  async execute(ctx) {
    const kind = classifyWarnChannel(ctx.channel.id, await loadWarnChannels(ctx.guild.id));

    if (kind === null) throw new PrefixAbort();

    if (!(await staffPermissionService.isStaff(ctx.member))) {
      throw new PrefixAbort(prefixMessages.common.notStaff);
    }

    const target = await requireTargetMember(ctx, prefixMessages.warn.userWarnUsage);
    const reason = textAfterTarget(ctx.rest);
    if (!reason) throw new PrefixAbort(prefixMessages.warn.reasonRequired);
    const evidence = evidenceUrls(ctx.message);

    if (kind === "USER") {
      await warningActionService.issueUserWarning({
        guildId: ctx.guild.id,
        targetId: target.id,
        reason,
        issuer: ctx.member,
        evidence,
      });
      await ctx.reply(prefixMessages.warn.userWarned(`<@${target.id}>`, reason));
      return;
    }

    if (!(await staffPermissionService.isStaffManager(ctx.member))) {
      throw new PrefixAbort(prefixMessages.warn.staffWarnManagerOnly);
    }

    const result = await warningActionService.issueVerbalStaffWarning({
      guild: ctx.guild,
      target,
      reason,
      issuer: ctx.member,
      evidence,
    });

    const mention = `<@${target.id}>`;
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
