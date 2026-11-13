import { L as tr } from "../../../shared/utils/lang-context.ts";
import { punishmentConfig } from "../../../data/config/punishment.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { formatDuration } from "../services/duration.service.ts";

const L = punishmentMessages.log;

function typeLabel(type: string): string {
  return punishmentMessages.labels[type] ?? type;
}

export function buildPunishmentLog(punishment: Punishment): string {
  const lines = [
    L.heading,
    L.line(tr("Target", "الهدف"), L.target(punishment.userId)),
    L.line(tr("Type", "النوع"), typeLabel(punishment.type)),
    L.line(tr("Reason", "السبب"), punishment.reason || L.none),
  ];

  // Timeout and jail are logged here and nowhere else, so the duration and the
  // evidence the moderator uploaded have to survive in this message.
  if (punishment.duration) {
    lines.push(L.line(tr("Duration", "المدة"), formatDuration(punishment.duration)));
  }
  if (punishment.expiresAt) {
    const at = Math.floor(punishment.expiresAt.getTime() / 1000);
    lines.push(L.line(tr("Ends", "ينتهي"), `<t:${at}:f> (<t:${at}:R>)`));
  }
  if (punishment.evidence?.length) {
    lines.push(
      L.line(tr("Proof", "الدليل"), punishment.evidence.slice(0, punishmentConfig.maxEvidenceShown).join(" ")),
    );
  }

  lines.push(
    L.line(tr("Issued by", "مُصدِر العقوبة"), `<@${punishment.issuedBy}>`),
    L.line(tr("Approved by", "وافق عليها"), punishment.approvedBy ? `<@${punishment.approvedBy}>` : L.none),
    L.line(
      tr("Carried out", "تاريخ التنفيذ"),
      punishment.executedAt
        ? `<t:${Math.floor(punishment.executedAt.getTime() / 1000)}:f>`
        : L.none,
    ),
    L.line(tr("Report ID", "آيدي البلاغ"), punishment.reportId ? `\`${punishment.reportId}\`` : L.none),
    L.line(tr("Status", "الحالة"), punishment.status),
  );

  if (punishment.status === "REJECTED") {
    lines.push(L.line(tr("Rejection reason", "سبب الرفض"), punishment.rejectionReason || L.none));
  }
  if (punishment.status === "FAILED") {
    lines.push(L.line(tr("Failure reason", "سبب الفشل"), punishment.failureReason || L.none));
  }

  return lines.join("\n");
}
