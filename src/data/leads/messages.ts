import { emojis } from "../emojis/index.ts";

const E = emojis;
const date = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:f>`;

export const leadMessages = {
  command: {
    description: "إدارة المسؤولين عن الطاقم الاداري والرتب والمسؤوليات",
    create: "إنشاء مسؤول جديد",
    assign: "تعيين من يمسك المسؤول",
    remove: "إزالة الماسك الحالي للمسؤول",
    list: "عرض كل المسؤولين",
    info: "تفاصيل مسؤول وسجله",
    name: "اسم المسؤول (مثال: مسؤول الطاقم الاداري)",
    descriptionOption: "الوصف",
    lead: "المسؤول",
    targetUser: "الهدف: عضو",
    targetRole: "الهدف: رتبة",
    targetResponsibility: "الهدف: مسؤولية",
    holderUser: "المسؤول: عضو",
    holderRole: "المسؤول: رتبة",
    replace: "استبدال الماسك الحالي إذا فيه واحد",
  },

  errors: {
    adminOnly: `${E.error} هذا للأدمن بس.`,
    oneTarget: `${E.error} اختر هدف واحد بس: عضو أو رتبة أو مسؤولية.`,
    oneHolder: `${E.error} اختر ماسك واحد بس: عضو أو رتبة.`,
    holderRequired: `${E.error} لازم تختار عضو أو رتبة يمسك المسؤول.`,
    nameTaken: (name: string) => `${E.error} فيه مسؤول اسمه **${name}** أصلاً.`,
    fieldsRequired: `${E.error} الاسم والوصف مطلوبين.`,
    notFound: `${E.error} ما لقيت هذا المسؤول.`,
    responsibilityNotFound: `${E.error} ما لقيت هذي المسؤولية.`,
    everyone: `${E.error} رتبة @everyone ما تنفع هنا.`,
    bot: `${E.error} ما ينفع البوت يكون مسؤول.`,
    occupied: (name: string, holder: string) =>
      `${E.warning} **${name}** ماسكه حالياً ${holder}.\nلو تبي تستبدله أعد الأمر مع \`replace: True\`.`,
    sameHolder: (holder: string) => `${E.warning} ${holder} ماسك هذا المسؤول أصلاً.`,
    noHolder: (name: string) => `${E.warning} **${name}** ما له ماسك حالياً.`,
  },

  created: (name: string, target: string, holder: string | null) =>
    [
      `${E.success} تم إنشاء المسؤول **${name}**.`,
      `**الهدف:** ${target}`,
      `**الماسك:** ${holder ?? "ما فيه — استخدم `/lead assign`"}`,
    ].join("\n"),
  assigned: (name: string, holder: string) => `${E.success} صار ${holder} ماسك **${name}**.`,
  replaced: (name: string, previous: string, holder: string) =>
    `${E.success} تم استبدال ${previous} بـ ${holder} في **${name}**. السجل محفوظ.`,
  removed: (name: string, holder: string) => `${E.success} تم إزالة ${holder} من **${name}**. السجل محفوظ.`,

  targetUser: (id: string) => `عضو <@${id}>`,
  targetRole: (id: string) => `رتبة <@&${id}>`,
  targetResponsibility: (title: string) => `مسؤولية **${title}**`,
  holder: (type: string, id: string) => (type === "ROLE" ? `<@&${id}>` : `<@${id}>`),

  list: {
    title: "## المسؤولين",
    empty: "ما فيه مسؤولين مضافين — استخدم `/lead create`.",
    row: (name: string, target: string, holder: string | null) =>
      `• **${name}** — ${target} ← ${holder ?? "بدون ماسك"}`,
  },

  info: {
    title: (name: string) => `## ${name}`,
    description: (text: string) => text,
    target: (text: string) => `**الهدف:** ${text}`,
    holder: (text: string | null) => `**الماسك الحالي:** ${text ?? "ما فيه"}`,
    historyHeading: "### السجل",
    historyRow: (holder: string, status: string, by: string, at: Date, endedAt: Date | null) =>
      `-# ${holder} — ${status} — عيّنه <@${by}> ${date(at)}${endedAt ? ` · انتهى ${date(endedAt)}` : ""}`,
    statuses: { ACTIVE: "حالي", REPLACED: "تم استبداله", REMOVED: "انشال" } as Record<string, string>,
    none: "-# لا شيء.",
  },

  stats: {
    yourLeads: "### مسؤولك",
    leadRow: (name: string, holder: string) => `• ${name}: ${holder}`,
    leading: "### مسؤول عن",
    leadingRow: (name: string, target: string) => `• ${name} ← ${target}`,
    none: "-# ما له مسؤول مضبوط.",
  },
} as const;
