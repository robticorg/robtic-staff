import { customEmojis, emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const who = (category: "STAFF" | "OWNER") => (category === "OWNER" ? "Owner" : "Staff");

export const staffWarnChannelMessage = bilingual(
  {
    heading: (level: number, category: "STAFF" | "OWNER" = "STAFF") => `**${who(category)} Warn ${level} ${customEmojis.attention}**`,
    headingVerbal: `**Staff Warn (verbal) ${customEmojis.attention}**`,
    headingVerbalFor: (category: "STAFF" | "OWNER" = "STAFF") => `**${who(category)} Warn (verbal) ${customEmojis.attention}**`,
    mention: (userId: string) => `**Member: <@${userId}>**`,
    reason: (reason: string) => `**Reason: ${reason}**`,
    proof: (proof: string) => `**Proof: ${proof}**`,
    noProof: "None",
    proofSeparator: " ",
    truncated: "…",
  },
  {
    heading: (level: number, category: "STAFF" | "OWNER" = "STAFF") => `**${who(category)} Warn ${level} ${customEmojis.attention}**`,
    headingVerbal: `**Staff Warn شفوي ${customEmojis.attention}**`,
    headingVerbalFor: (category: "STAFF" | "OWNER" = "STAFF") => `**${who(category)} Warn شفوي ${customEmojis.attention}**`,
    mention: (userId: string) => `**منشن : <@${userId}>**`,
    reason: (reason: string) => `**السبب : ${reason}**`,
    proof: (proof: string) => `**الدليل : ${proof}**`,
    noProof: "لا يوجد",
    proofSeparator: " ",
    truncated: "…",
  },
);

export const warningMessages = bilingual(
  {
    user: {
      issued: (userMention: string, reason: string) => `${emojis.warning} ${userMention} warned. Reason: ${reason}`,
      revoked: (userMention: string) => `${emojis.success} Warning removed from ${userMention}.`,
    },
    staff: {
      issued: (staffMention: string, level: number, reason: string) => `${emojis.warning} ${staffMention} got **staff warning ${level}**. Reason: ${reason}`,
      removed: (staffMention: string) => `${emojis.success} Staff warning removed from ${staffMention}.`,
    },
    appeal: {
      submitted: "Your appeal was sent for review.",
      accepted: "Your appeal was accepted.",
      rejected: "Your appeal was rejected.",
    },
    log: {
      titleUser: "⚠️ Member warning",
      titleVerbal: "🗣️ Verbal staff warning",
      titleReal: "⛔ Official staff warning",
      target: "Member",
      issuer: "By",
      warnType: "Type",
      typeName: { VERBAL: "Verbal", REAL: "Official" } as Record<string, string>,
      level: "Level",
      levelName: (level: number) => `Warning ${level}`,
      reason: "Reason",
      convertedFrom: "Verbal warnings turned official",
      evidence: "Evidence",
      warnId: "Warning ID",
      footer: "Warnings",
    },
  },
  {
    user: {
      issued: (userMention: string, reason: string) => `${emojis.warning} تم تحذير ${userMention}. السبب: ${reason}`,
      revoked: (userMention: string) => `${emojis.success} تم إلغاء تحذير ${userMention}.`,
    },
    staff: {
      issued: (staffMention: string, level: number, reason: string) => `${emojis.warning} ${staffMention} حصل على **تحذير إداري ${level}**. السبب: ${reason}`,
      removed: (staffMention: string) => `${emojis.success} تم حذف تحذير الطاقم عن ${staffMention}.`,
    },
    appeal: {
      submitted: "انرسل استئنافك للمراجعة.",
      accepted: "تم قبول استئنافك.",
      rejected: "تم رفض استئنافك.",
    },
    log: {
      titleUser: "⚠️ تحذير عضو",
      titleVerbal: "🗣️ تحذير شفوي على إداري",
      titleReal: "⛔ تحذير رسمي على إداري",
      target: "العضو",
      issuer: "بواسطة",
      warnType: "النوع",
      typeName: { VERBAL: "شفوي", REAL: "رسمي" } as Record<string, string>,
      level: "المستوى",
      levelName: (level: number) => (level === 1 ? "التحذير الأول" : level === 2 ? "التحذير الثاني" : level === 3 ? "التحذير الثالث" : `التحذير ${level}`),
      reason: "السبب",
      convertedFrom: "التحذيرات الشفوية المحوَّلة",
      evidence: "الأدلة",
      warnId: "آيدي التحذير",
      footer: "نظام التحذيرات",
    },
  },
);
