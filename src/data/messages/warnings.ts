import { emojis } from "../emojis/index.ts";

export const warningMessages = {
  user: {
    issued: (userMention: string, reason: string) =>
      `${emojis.warning} تم تحذير ${userMention}.\nالسبب: ${reason}`,
    revoked: (userMention: string) => `${emojis.success} تم إلغاء تحذير ${userMention}.`,
  },
  staff: {
    issued: (staffMention: string, level: number, reason: string) =>
      `${emojis.warning} ${staffMention} حصل على **تحذير ستاف ${level}**.\nالسبب: ${reason}`,
    removed: (staffMention: string) =>
      `${emojis.success} تم حذف تحذير الستاف عن ${staffMention}.`,
  },
  appeal: {
    submitted: "تم إرسال استئنافك للمراجعة.",
    accepted: "تم قبول استئنافك.",
    rejected: "تم رفض استئنافك.",
  },
  log: {
    titleUser: "⚠️ تحذير عضو",
    titleVerbal: "🗣️ تحذير شفوي على ستاف",
    titleReal: "⛔ تحذير رسمي على ستاف",
    target: "العضو",
    issuer: "بواسطة",
    warnType: "نوع التحذير",
    typeName: { VERBAL: "تحذير شفوي", REAL: "تحذير رسمي" } as Record<string, string>,
    level: "المستوى",
    levelName: (level: number) =>
      level === 1 ? "التحذير الأول" : level === 2 ? "التحذير الثاني" : level === 3 ? "التحذير الثالث" : `التحذير ${level}`,
    reason: "السبب",
    convertedFrom: "التحذيرات الشفوية المحوَّلة",
    evidence: "الأدلة",
    warnId: "آيدي التحذير",
    footer: "نظام التحذيرات",
  },
} as const;
