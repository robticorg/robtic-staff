import { punishmentMessages } from "../../../data/messages/punishment.ts";
import type { Punishment } from "../models/punishment.model.ts";

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
  ];

  if (punishment.status === "REJECTED") {
    lines.push(L.line("سبب الرفض", punishment.rejectionReason || L.none));
  }
  if (punishment.status === "FAILED") {
    lines.push(L.line("سبب الفشل", punishment.failureReason || L.none));
  }

  return lines.join("\n");
}
