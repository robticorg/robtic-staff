import { emojis } from "../emojis/index.ts";
import { staffInfoLimits as L } from "./config.ts";

const E = emojis;

export const staffInfoMessages = {
  panel: {
    empty: "-# ما فيه معلومات مضافة بعد.",
  },

  viewer: {
    pageFooter: (page: number, pages: number) => `-# صفحة ${page} من ${pages}`,
    previous: "السابق",
    next: "التالي",
    gone: `${E.error} هذي المعلومة انحذفت أو تغيّرت — اختر من القائمة من جديد.`,
  },

  modal: {
    addTitle: "إضافة معلومة",
    pageTitle: "إضافة صفحة",
    nameLabel: "الاسم (يظهر في القائمة)",
    namePlaceholder: "مثال: قوانين الإدارة",
    descriptionLabel: "الوصف (تحت الاسم في القائمة)",
    descriptionPlaceholder: "مثال: كل القوانين اللي لازم تعرفها",
    contentLabel: "المحتوى",
    contentPlaceholder: "المحتوى اللي يظهر للعضو لما يختار المعلومة",
  },

  command: {
    description: "إدارة لوحة معلومات الإدارة",
    setup: "نشر لوحة المعلومات في هذا الروم (أو تحديثها)",
    add: "إضافة معلومة جديدة للقائمة",
    remove: "حذف معلومة من القائمة",
    see: "عرض المعلومات المضافة، أو معاينة وحدة منها",
    pageGroup: "صفحات المعلومة",
    pageAdd: "إضافة صفحة جديدة لمعلومة",
    infoOption: "المعلومة",

    setupDone: (channelId: string) => `${E.success} تم نشر لوحة المعلومات في <#${channelId}>.`,
    setupUpdated: (channelId: string) => `${E.success} تم تحديث لوحة المعلومات في <#${channelId}>.`,
    setupChannelInvalid: `${E.error} استخدم الأمر في روم نصي.`,

    added: (name: string, panelUpdated: boolean) =>
      `${E.success} تمت إضافة **${name}**.` +
      (panelUpdated ? " وتحدّثت اللوحة." : "\n-# اللوحة مو منشورة بعد — استخدم `/info setup`."),
    removed: (name: string) => `${E.success} تم حذف **${name}** وتحدّثت اللوحة.`,
    pageAdded: (name: string, page: number) => `${E.success} تمت إضافة الصفحة **${page}** لـ **${name}**.`,

    notFound: `${E.error} ما لقيت هذي المعلومة — اختر من القائمة.`,
    nameTaken: (name: string) => `${E.error} فيه معلومة اسمها **${name}** أصلاً.`,
    tooMany: `${E.error} وصلت الحد الأقصى (${L.maxInfos} معلومة) — القائمة ما تتحمل أكثر.`,
    tooManyPages: `${E.error} وصلت الحد الأقصى (${L.maxPages} صفحة) لهذي المعلومة.`,
    fieldsRequired: `${E.error} الاسم والوصف والمحتوى كلها مطلوبة.`,
    contentRequired: `${E.error} لازم تكتب محتوى الصفحة.`,

    listTitle: "**المعلومات المضافة**",
    listEmpty: "ما فيه معلومات مضافة بعد — استخدم `/info add`.",
    listRow: (index: number, name: string, description: string, pages: number) =>
      `**${index}. ${name}** — ${description} · ${pages} ${pages === 1 ? "صفحة" : "صفحات"}`,
  },
} as const;
