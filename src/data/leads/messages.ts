import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const date = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:f>`;
const holder = (type: string, id: string) => (type === "ROLE" ? `<@&${id}>` : `<@${id}>`);

export const leadMessages = bilingual(
  {
    command: {
      description: "Manage the leads over staff, roles and responsibilities",
      create: "Create a lead",
      assign: "Set who holds a lead",
      remove: "Remove a lead's current holder",
      list: "Show every lead",
      info: "A lead's details and history",
      name: "Lead name (e.g. Staff lead)",
      descriptionOption: "Description",
      lead: "The lead",
      targetUser: "Target: member",
      targetRole: "Target: role",
      targetResponsibility: "Target: responsibility",
      holderUser: "Holder: member",
      holderRole: "Holder: role",
      replace: "Replace the current holder if there is one",
    },

    errors: {
      adminOnly: `${E.error} Admins only.`,
      oneTarget: `${E.error} Pick one target: a member, a role or a responsibility.`,
      oneHolder: `${E.error} Pick one holder: a member or a role.`,
      holderRequired: `${E.error} Choose a member or role to hold it.`,
      nameTaken: (name: string) => `${E.error} **${name}** already exists.`,
      fieldsRequired: `${E.error} Name and description are required.`,
      notFound: `${E.error} Couldn't find that lead.`,
      responsibilityNotFound: `${E.error} Couldn't find that responsibility.`,
      everyone: `${E.error} @everyone doesn't work here.`,
      bot: `${E.error} A bot can't be a lead.`,
      occupied: (name: string, h: string) => `${E.warning} ${h} holds **${name}**. Run it again with \`replace: True\` to replace them.`,
      sameHolder: (h: string) => `${E.warning} ${h} already holds this lead.`,
      noHolder: (name: string) => `${E.warning} **${name}** has no holder.`,
    },

    created: (name: string, target: string, h: string | null) =>
      [`${E.success} Lead **${name}** created.`, `**Target:** ${target}`, `**Holder:** ${h ?? "none — use `/lead assign`"}`].join("\n"),
    assigned: (name: string, h: string) => `${E.success} ${h} now holds **${name}**.`,
    replaced: (name: string, previous: string, h: string) => `${E.success} ${h} replaced ${previous} on **${name}**. History kept.`,
    removed: (name: string, h: string) => `${E.success} ${h} removed from **${name}**. History kept.`,

    targetUser: (id: string) => `member <@${id}>`,
    targetRole: (id: string) => `role <@&${id}>`,
    targetResponsibility: (title: string) => `responsibility **${title}**`,
    holder,

    list: {
      title: "## Leads",
      empty: "No leads yet. Use `/lead create`.",
      row: (name: string, target: string, h: string | null) => `• **${name}** — ${target} ← ${h ?? "no holder"}`,
    },

    info: {
      title: (name: string) => `## ${name}`,
      description: (text: string) => text,
      target: (text: string) => `**Target:** ${text}`,
      holder: (text: string | null) => `**Holder:** ${text ?? "none"}`,
      historyHeading: "### History",
      historyRow: (h: string, status: string, by: string, at: Date, endedAt: Date | null) =>
        `-# ${h} — ${status} — set by <@${by}> ${date(at)}${endedAt ? ` · ended ${date(endedAt)}` : ""}`,
      statuses: { ACTIVE: "Current", REPLACED: "Replaced", REMOVED: "Removed" } as Record<string, string>,
      none: "-# Nothing.",
    },

    stats: {
      yourLeads: "### Your lead",
      leadRow: (name: string, h: string) => `• ${name}: ${h}`,
      leading: "### Leads",
      leadingRow: (name: string, target: string) => `• ${name} ← ${target}`,
      none: "-# No lead set.",
    },
  },
  {
    command: {
      description: "إدارة المسؤولين عن الطاقم والرتب والمسؤوليات",
      create: "إنشاء مسؤول",
      assign: "تعيين من يمسك المسؤول",
      remove: "إزالة الماسك الحالي",
      list: "عرض كل المسؤولين",
      info: "تفاصيل مسؤول وسجله",
      name: "اسم المسؤول (مثال: مسؤول الطاقم)",
      descriptionOption: "الوصف",
      lead: "المسؤول",
      targetUser: "الهدف: عضو",
      targetRole: "الهدف: رتبة",
      targetResponsibility: "الهدف: مسؤولية",
      holderUser: "الماسك: عضو",
      holderRole: "الماسك: رتبة",
      replace: "استبدال الماسك الحالي إذا فيه",
    },

    errors: {
      adminOnly: `${E.error} للأدمن بس.`,
      oneTarget: `${E.error} اختر هدف واحد: عضو أو رتبة أو مسؤولية.`,
      oneHolder: `${E.error} اختر ماسك واحد: عضو أو رتبة.`,
      holderRequired: `${E.error} اختر عضو أو رتبة يمسكه.`,
      nameTaken: (name: string) => `${E.error} **${name}** موجود أصلاً.`,
      fieldsRequired: `${E.error} الاسم والوصف مطلوبين.`,
      notFound: `${E.error} ما لقيت المسؤول.`,
      responsibilityNotFound: `${E.error} ما لقيت المسؤولية.`,
      everyone: `${E.error} @everyone ما تنفع هنا.`,
      bot: `${E.error} البوت ما يصير مسؤول.`,
      occupied: (name: string, h: string) => `${E.warning} ${h} ماسك **${name}**. أعد الأمر مع \`replace: True\` لاستبداله.`,
      sameHolder: (h: string) => `${E.warning} ${h} ماسكه أصلاً.`,
      noHolder: (name: string) => `${E.warning} **${name}** ما له ماسك.`,
    },

    created: (name: string, target: string, h: string | null) =>
      [`${E.success} تم إنشاء المسؤول **${name}**.`, `**الهدف:** ${target}`, `**الماسك:** ${h ?? "ما فيه، استخدم `/lead assign`"}`].join("\n"),
    assigned: (name: string, h: string) => `${E.success} صار ${h} ماسك **${name}**.`,
    replaced: (name: string, previous: string, h: string) => `${E.success} صار ${h} بدل ${previous} في **${name}**. السجل محفوظ.`,
    removed: (name: string, h: string) => `${E.success} تمت إزالة ${h} من **${name}**. السجل محفوظ.`,

    targetUser: (id: string) => `عضو <@${id}>`,
    targetRole: (id: string) => `رتبة <@&${id}>`,
    targetResponsibility: (title: string) => `مسؤولية **${title}**`,
    holder,

    list: {
      title: "## المسؤولين",
      empty: "ما فيه مسؤولين؛ استخدم `/lead create`.",
      row: (name: string, target: string, h: string | null) => `• **${name}** — ${target} ← ${h ?? "بدون ماسك"}`,
    },

    info: {
      title: (name: string) => `## ${name}`,
      description: (text: string) => text,
      target: (text: string) => `**الهدف:** ${text}`,
      holder: (text: string | null) => `**الماسك:** ${text ?? "ما فيه"}`,
      historyHeading: "### السجل",
      historyRow: (h: string, status: string, by: string, at: Date, endedAt: Date | null) =>
        `-# ${h} — ${status} — عيّنه <@${by}> ${date(at)}${endedAt ? ` · انتهى ${date(endedAt)}` : ""}`,
      statuses: { ACTIVE: "حالي", REPLACED: "تم استبداله", REMOVED: "انشال" } as Record<string, string>,
      none: "-# لا شيء.",
    },

    stats: {
      yourLeads: "### مسؤولك",
      leadRow: (name: string, h: string) => `• ${name}: ${h}`,
      leading: "### مسؤول عن",
      leadingRow: (name: string, target: string) => `• ${name} ← ${target}`,
      none: "-# ما له مسؤول مضبوط.",
    },
  },
);
