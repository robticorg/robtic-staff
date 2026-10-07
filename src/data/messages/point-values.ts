import { emojis } from "../emojis/index.ts";

const E = emojis;

export const pointValuesMessages = {
  panel: {
    title: "## قيم النقاط",
    hint: "كم نقطة ياخذ الاداري على كل عمل يسويه البوت. اضغط على القسم اللي تبي تعدّله:",
    row: (label: string, value: number, isDefault: boolean) =>
      `${label}: **${value}**${isDefault ? " (الافتراضي)" : ""}`,
    groupHeading: (title: string) => `### ${title}`,
  },
  groups: {
    claims: "التكتات والبلاغات",
    moderation: "التحذيرات والعقوبات",
  },
  modalTitle: (group: string) => `قيم النقاط — ${group}`,
  inputPlaceholder: (defaultValue: number) => `الافتراضي: ${defaultValue}`,
  saved: `${E.success} تم حفظ قيم النقاط.`,
  invalid: (label: string) =>
    `${E.error} قيمة **${label}** لازم تكون رقم صحيح بين -1000 و 1000 (اكتب 0 عشان توقفها).`,
  adminOnly: `${E.error} هذا للأدمن بس.`,
  failed: `${E.error} ما قدرت أحفظ القيم، حاول مرة ثانية.`,
} as const;

export const startCountMessages = {
  saved: (start: number) =>
    `${E.success} صار العد يبدأ من **${start}** — أول رتبة في السلّم هي المستوى **${start}**.`,
} as const;
