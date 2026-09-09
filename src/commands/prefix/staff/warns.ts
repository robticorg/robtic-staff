import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffService } from "../../../modules/staff/index.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { warningActionService } from "../../../modules/warnings/services/warning-actions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";

export default definePrefixCommand({
  name: "warns",
  category: "staff",
  async execute(ctx) {
    const warningId = ctx.args[0];
    if (!warningId) throw new PrefixAbort(prefixMessages.warn.warnsUsage);

    const found = await warningActionService.findWarning(warningId);
    if (!found) throw new PrefixAbort(prefixMessages.warn.warningNotFound);

    const isStaff = await staffPermissionService.isStaff(ctx.member);
    const isManager = await staffPermissionService.isStaffManager(ctx.member);

    const lines: string[] = [];
    if (found.kind === "USER") {
      const w = found.doc;
      const isOwner = w.userId === ctx.member.id;
      if (!isStaff && !isOwner) throw new PrefixAbort(prefixMessages.warn.detailNotAllowed);
      lines.push(
        `**تحذير عضو** \`${w._id.toString()}\``,
        `العضو: <@${w.userId}>`,
        `الحالة: ${w.status}`,
        `المصدر: ${w.source}`,
        `أصدره: <@${w.issuedBy}>`,
        `السبب: ${w.reason}`,
        `التاريخ: <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
      );
      if (w.evidence.length) lines.push(`الأدلة:\n${w.evidence.join("\n")}`);
      if (w.revokedBy) {
        lines.push(`ألغاه <@${w.revokedBy}>${w.revokeReason ? ` — ${w.revokeReason}` : ""}`);
      }
    } else {
      const w = found.doc;
      const targetStaff = await staffService.getByIdOrThrow(w.staffId).catch(() => null);
      const isOwner = !!targetStaff && targetStaff.userId === ctx.member.id;
      if (!isManager && !isOwner) throw new PrefixAbort(prefixMessages.warn.detailNotAllowed);
      const kind = (w.type ?? "REAL") as "VERBAL" | "REAL";
      lines.push(
        `**تحذير ستاف** \`${w._id.toString()}\``,
        targetStaff ? `عضو الستاف: <@${targetStaff.userId}>` : `آيدي الستاف: ${w.staffId.toString()}`,
        `نوع التحذير: ${prefixMessages.warn.typeLabel(kind)}`,
      );
      if (kind === "REAL" && w.level) {
        lines.push(`المستوى: ${prefixMessages.warn.levelLabel(w.level)}`);
      }
      if (kind === "VERBAL" && w.status === "CONVERTED") {
        lines.push(`الحالة: ${prefixMessages.warn.convertedStatusLabel}`);
      } else {
        lines.push(`الحالة: ${w.status}`);
      }
      if (kind === "REAL" && w.sourceVerbalWarningIds?.length) {
        lines.push(`التحذيرات الشفوية المحوَّلة: ${w.sourceVerbalWarningIds.length}`);
      }
      lines.push(
        `أصدره: <@${w.issuedBy}>`,
        `السبب: ${w.reason}`,
        `التاريخ: <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
      );
      if (w.evidence.length) lines.push(`الأدلة:\n${w.evidence.join("\n")}`);
      if (w.removedBy) {
        lines.push(`حذفه <@${w.removedBy}>${w.removalReason ? ` — ${w.removalReason}` : ""}`);
      }
    }

    await ctx.reply(lines.join("\n").slice(0, 1900));
  },
});
