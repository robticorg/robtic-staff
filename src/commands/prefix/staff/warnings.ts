import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffService } from "../../../modules/staff/index.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { staffWarningService, userWarningService } from "../../../modules/warnings/index.ts";
import { WarningCategory } from "../../../modules/warnings/types/enums.ts";
import { resolveWarningCategory } from "../../../modules/warnings/services/warning-actions.service.ts";
import { firstUserTarget } from "../_shared/parse.ts";
import { PrefixAbort } from "../_shared/guards.ts";

const W = prefixMessages.warn;

export default definePrefixCommand({
  name: "warnings",
  category: "staff",
  async execute(ctx) {
    const targetId = ctx.mentionedUsers[0]?.id ?? firstUserTarget(ctx.args) ?? ctx.member.id;
    const viewingSelf = targetId === ctx.member.id;

    const isStaff = await staffPermissionService.canActAsStaff(ctx.member);
    if (!viewingSelf && !isStaff) throw new PrefixAbort(W.privacyDenied);

    const isManager = await staffPermissionService.isStaffManager(ctx.member);
    const lines: string[] = [W.warningsHeader(`<@${targetId}>`)];

    const userWarnings = await userWarningService.listForUser(ctx.guild.id, targetId, { sort: 1 });
    userWarnings.forEach((w, i) => {
      lines.push(W.userWarnLine(i + 1, w._id.toString(), w.status, truncate(w.reason)));
    });

    const targetStaff = await staffService.get(targetId, ctx.guild.id);
    if (targetStaff && (isManager || viewingSelf)) {
      const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
      const category = targetMember
        ? await resolveWarningCategory(targetMember)
        : WarningCategory.STAFF;
      const [verbalActive, verbalConverted, realLevel] = await Promise.all([
        staffWarningService.countActiveVerbal(targetStaff._id, category),
        staffWarningService.countConvertedVerbal(targetStaff._id, category),
        staffWarningService.currentRealLevel(targetStaff._id, category),
      ]);
      lines.push("", W.verbalSection, W.verbalSummary(verbalActive, verbalConverted));
      lines.push("", W.realSection, W.realSummary(realLevel));
    }

    if (lines.length === 1) {
      await ctx.reply(W.noWarnings(`<@${targetId}>`));
      return;
    }
    await ctx.reply(lines.join("\n").slice(0, 1900));
  },
});

function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
