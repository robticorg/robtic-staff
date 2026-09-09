import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";

const E = emojis;

export const appealMessages = {
  serverName: branding.communityName,

  dm: {
    appealButton: "استئناف",
    whyButton: "ليش تعاقبت؟",

    windowExpired:
      "انتهت مدة عرض الأدلة. لو تحتاج مساعدة إضافية تواصل مع الدعم عن طريق تكت.",
    notYours: `${E.error} هذي مو عقوبتك.`,
    punishmentGone: `${E.error} سجل العقوبة هذا ما لقيته.`,

    notEligible: `${E.error} هذه العقوبة ما ينفع تستأنف عليها.`,
    alreadyAppealedPending: `${E.warning} عندك استئناف قيد المراجعة لهذه العقوبة أصلاً.`,
    alreadyAppealedDecided: (status: string) =>
      `${E.error} تم استئناف هذه العقوبة من قبل (${status}). ما ينفع تستأنف عليها مرة ثانية.`,
    systemUnavailable: `${E.error} نظام الاستئناف مو متاح حالياً. جرب بعدين أو افتح تكت دعم.`,

    modalTitle: "استئناف عقوبة",
    reasonLabel: "سبب الاستئناف",
    reasonPlaceholder: "ليش تشوف إن هذه العقوبة لازم تتشال أو تتعدّل؟",
    evidenceLabel: "أدلة إضافية (اختياري)",
    evidencePlaceholder: "روابط لصور أو أدلة ثانية، رابط في كل سطر.",
    reasonRequired: `${E.error} لازم تكتب سبب للاستئناف.`,

    submitted:
      "تم إرسال استئنافك وراح يراجعه فريق الستاف. راح توصلك رسالة هنا لمّا يصير قرار.",

    accepted: (punishment: string, reason: string) =>
      [
        "تم قبول استئنافك.",
        "",
        `**العقوبة:** ${punishment}`,
        `**القرار:** ${reason}`,
        "",
        "تم إلغاء العقوبة.",
      ].join("\n"),
    rejected: (punishment: string, reason: string) =>
      [
        "تم رفض استئنافك.",
        "",
        `**العقوبة:** ${punishment}`,
        `**القرار:** ${reason}`,
      ].join("\n"),
  },

  why: {
    body: (typeLabel: string, reason: string, issuedAt: Date | undefined, evidence: string[]) =>
      [
        `**العقوبة:** ${typeLabel}`,
        `**السبب:** ${reason}`,
        issuedAt ? `**تاريخ الإصدار:** <t:${Math.floor(issuedAt.getTime() / 1000)}:f>` : null,
        "",
        evidence.length ? `**الأدلة:**\n${evidence.join("\n")}` : "**الأدلة:** ما فيه شي",
      ]
        .filter((l): l is string => l !== null)
        .join("\n"),
  },

  review: {
    heading: `${E.locked} **طلب استئناف**`,
    user: (userId: string) => `**العضو:** <@${userId}> (\`${userId}\`)`,
    punishment: (typeLabel: string) => `**العقوبة:** ${typeLabel}`,
    punishmentId: (id: string) => `**آيدي العقوبة:** \`${id}\``,
    reason: (reason: string) => `**سبب الاستئناف:**\n${reason}`,
    evidence: (items: string[]) =>
      items.length ? `**الأدلة:**\n${items.join("\n")}` : "**الأدلة:** ما فيه شي",
    statusPending: "**الحالة:** قيد المراجعة",
    statusClaimed: (userId: string) => `**الحالة:** استلمه <@${userId}>`,
    statusAccepted: (userId: string, reason: string) =>
      `**الحالة:** مقبول\n**راجعه:** <@${userId}>\n**القرار:**\n${reason}`,
    statusRejected: (userId: string, reason: string) =>
      `**الحالة:** مرفوض\n**راجعه:** <@${userId}>\n**القرار:**\n${reason}`,

    claimButton: "استلام",
    acceptButton: "قبول",
    rejectButton: "رفض",
    infoButton: "معلومات",

    notAuthorized: `${E.error} ما عندك صلاحية تراجع الاستئنافات.`,
    selfReview: `${E.error} ما تقدر تراجع استئناف لعقوبة كنت طرف فيها.`,
    alreadyClaimed: (userId: string) => `${E.warning} هذا الاستئناف مستلَم أصلاً من <@${userId}>.`,
    claimedAck: `${E.success} استلمت هذا الاستئناف.`,
    alreadyDecided: `${E.error} تم البت في هذا الاستئناف من قبل.`,
    gone: `${E.error} هذا الاستئناف ما عاد موجود.`,
    punishmentGone: `${E.error} عقوبة هذا الاستئناف ما لقيتها.`,

    decisionModalTitleAccept: "قبول الاستئناف",
    decisionModalTitleReject: "رفض الاستئناف",
    decisionReasonLabel: "سبب القرار",
    decisionReasonPlaceholder: "وضّح القرار (العضو راح يشوفه).",
    decisionReasonRequired: `${E.error} لازم تكتب سبب للقرار.`,

    acceptedAck: `${E.success} تم قبول الاستئناف — تم إلغاء العقوبة.`,
    acceptedAckPartial: `${E.warning} تم قبول الاستئناف، بس تعديل ديسكورد ما انطبق بالكامل. راجع اللوقات.`,
    rejectedAck: `${E.success} تم رفض الاستئناف. العقوبة تظل قائمة.`,

    infoTitle: `${E.locked} **الاستئناف — التفاصيل**`,
    infoLine: (label: string, value: string) => `**${label}:** ${value}`,
  },
} as const;
