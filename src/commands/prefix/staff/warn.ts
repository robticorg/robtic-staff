import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { staffManagementAuthorizationService } from "../../../modules/staff/services/staff-management-authorization.service.ts";
import { classifyWarnChannel } from "../../../modules/warnings/services/warn-channels.ts";
import {
  warningActionService,
  type WarningConsequence,
} from "../../../modules/warnings/services/warning-actions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { requireTargetMember } from "../_shared/target.ts";
import {
  evidenceUrls,
  isProofExempt,
  loadWarnChannels,
  splitVerbalMarker,
  textAfterTarget,
} from "../_shared/warn-config.ts";
import { getLevelStart, shownLevel } from "../../../modules/configuration/utils/level-start.ts";

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
    // Administrators and Ship+ warn on the spot: no reason, no proof.
    const proofExempt = await isProofExempt(ctx.member);

    if (kind === "USER") {
      if (!rawReason && !proofExempt) throw new PrefixAbort(prefixMessages.warn.reasonRequired);
      const userReason = rawReason || prefixMessages.warn.noReason;
      await warningActionService.issueUserWarning({
        guildId: ctx.guild.id,
        targetId: target.id,
        reason: userReason,
        issuer: ctx.member,
        evidence,
      });
      await ctx.reply(prefixMessages.warn.userWarned(`<@${target.id}>`, userReason));
      return;
    }

    const decision = await staffManagementAuthorizationService.canWarn(ctx.member, target);
    if (!decision.allowed) throw new PrefixAbort(decision.message);

    const split = splitVerbalMarker(rawReason);
    const isVerbal = split.isVerbal;
    if (!split.reason && !proofExempt) throw new PrefixAbort(prefixMessages.warn.reasonRequired);
    const reason = split.reason || prefixMessages.warn.noReason;
    if (evidence.length === 0 && !proofExempt) {
      throw new PrefixAbort(prefixMessages.warn.proofRequired);
    }

    const mention = `<@${target.id}>`;

    if (!isVerbal) {
      const result = await warningActionService.issueDirectRealStaffWarning({
        guild: ctx.guild,
        target,
        reason,
        issuer: ctx.member,
        evidence,
        proofExempt,
      });
      const lines = [prefixMessages.warn.realRecorded(mention, result.level)];
      lines.push(...consequenceLines(mention, result.consequence, await getLevelStart(ctx.guild.id)));
      await ctx.reply(lines.join("\n"));
      return;
    }

    const result = await warningActionService.issueVerbalStaffWarning({
      guild: ctx.guild,
      target,
      reason,
      issuer: ctx.member,
      evidence,
      proofExempt,
    });

    const lines = [prefixMessages.warn.verbalRecorded(mention, reason)];
    if (result.escalation) {
      lines.push(prefixMessages.warn.convertedToReal(result.escalation.convertedVerbalCount));
      lines.push(prefixMessages.warn.realRecorded(mention, result.escalation.level));
      lines.push(...consequenceLines(mention, result.escalation.consequence, await getLevelStart(ctx.guild.id)));
    }
    await ctx.reply(lines.join("\n"));
  },
});

/** Warn 3 costs a demotion, or removal when there is no level left to drop to. */
function consequenceLines(mention: string, consequence: WarningConsequence, start: number): string[] {
  if (consequence.fired) return [prefixMessages.warn.firedNoLevelLeft(mention)];
  if (consequence.demoted) {
    return [
      prefixMessages.warn.demotedMaxWarnings(
        mention,
        shownLevel(consequence.fromLevel ?? 0, start),
        shownLevel(consequence.toLevel ?? 0, start),
      ),
    ];
  }
  return [];
}
