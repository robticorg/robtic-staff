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
    L.line("الهدف", L.target(punishment.userId)),
    L.line("النوع", typeLabel(punishment.type)),
    L.line("السبب", punishment.reason || L.none),
  ];

  // Timeout and jail are logged here and nowhere else, so the duration and the
  // evidence the moderator uploaded have to survive in this message.
  if (punishment.duration) {
    lines.push(L.line("المدة", formatDuration(punishment.duration)));
  }
  if (punishment.evidence?.length) {
    lines.push(
      L.line("الدليل", punishment.evidence.slice(0, punishmentConfig.maxEvidenceShown).join(" ")),
    );
  }

  lines.push(
    L.line("مُصدِر العقوبة", `<@${punishment.issuedBy}>`),
    L.line("وافق عليها", punishment.approvedBy ? `<@${punishment.approvedBy}>` : L.none),
    L.line(
      "تاريخ التنفيذ",
      punishment.executedAt
        ? `<t:${Math.floor(punishment.executedAt.getTime() / 1000)}:f>`
        : L.none,
    ),
    L.line("آيدي البلاغ", punishment.reportId ? `\`${punishment.reportId}\`` : L.none),
    L.line("الحالة", punishment.status),
  );

  if (punishment.status === "REJECTED") {
    lines.push(L.line("سبب الرفض", punishment.rejectionReason || L.none));
  }
  if (punishment.status === "FAILED") {
    lines.push(L.line("سبب الفشل", punishment.failureReason || L.none));
  }

  return lines.join("\n");
}
