import { L } from "../../../shared/utils/lang-context.ts";
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

    const isStaff = await staffPermissionService.canActAsStaff(ctx.member);
    const isManager = await staffPermissionService.isStaffManager(ctx.member);

    const lines: string[] = [];
    if (found.kind === "USER") {
      const w = found.doc;
      const isOwner = w.userId === ctx.member.id;
      if (!isStaff && !isOwner) throw new PrefixAbort(prefixMessages.warn.detailNotAllowed);
      lines.push(
        `**${L("Member warning", "تحذير عضو")}** \`${w._id.toString()}\``,
        `${L("Member", "العضو")}: <@${w.userId}>`,
        `${L("Status", "الحالة")}: ${w.status}`,
        `${L("Source", "المصدر")}: ${w.source}`,
        `${L("Issued by", "أصدره")}: <@${w.issuedBy}>`,
        `${L("Reason", "السبب")}: ${w.reason}`,
        `${L("Date", "التاريخ")}: <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
      );
      if (w.evidence.length) lines.push(`${L("Evidence", "الأدلة")}:\n${w.evidence.join("\n")}`);
      if (w.revokedBy) {
        lines.push(`${L("Revoked by", "ألغاه")} <@${w.revokedBy}>${w.revokeReason ? ` — ${w.revokeReason}` : ""}`);
      }
    } else {
      const w = found.doc;
      const targetStaff = await staffService.getByIdOrThrow(w.staffId).catch(() => null);
      const isOwner = !!targetStaff && targetStaff.userId === ctx.member.id;
      if (!isManager && !isOwner) throw new PrefixAbort(prefixMessages.warn.detailNotAllowed);
      const kind = (w.type ?? "REAL") as "VERBAL" | "REAL";
      lines.push(
        `**${L("Staff warning", "تحذير اداري")}** \`${w._id.toString()}\``,
        targetStaff ? `${L("Staff member", "عضو الطاقم الاداري")}: <@${targetStaff.userId}>` : `${L("Staff ID", "آيدي الطاقم الاداري")}: ${w.staffId.toString()}`,
        `${L("Type", "نوع التحذير")}: ${prefixMessages.warn.typeLabel(kind)}`,
      );
      if (kind === "REAL" && w.level) {
        lines.push(`${L("Level", "المستوى")}: ${prefixMessages.warn.levelLabel(w.level)}`);
      }
      if (kind === "VERBAL" && w.status === "CONVERTED") {
        lines.push(`${L("Status", "الحالة")}: ${prefixMessages.warn.convertedStatusLabel}`);
      } else {
        lines.push(`${L("Status", "الحالة")}: ${w.status}`);
      }
      if (kind === "REAL" && w.sourceVerbalWarningIds?.length) {
        lines.push(`${L("Verbal warnings turned official", "التحذيرات الشفوية المحوَّلة")}: ${w.sourceVerbalWarningIds.length}`);
      }
      lines.push(
        `${L("Issued by", "أصدره")}: <@${w.issuedBy}>`,
        `${L("Reason", "السبب")}: ${w.reason}`,
        `${L("Date", "التاريخ")}: <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
      );
      if (w.evidence.length) lines.push(`${L("Evidence", "الأدلة")}:\n${w.evidence.join("\n")}`);
      if (w.removedBy) {
        lines.push(`${L("Removed by", "حذفه")} <@${w.removedBy}>${w.removalReason ? ` — ${w.removalReason}` : ""}`);
      }
    }

    await ctx.reply(lines.join("\n").slice(0, 1900));
  },
});
