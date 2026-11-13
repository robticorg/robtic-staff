import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const pointValuesMessages = bilingual(
  {
    panel: {
      title: "## Point values",
      hint: "Points staff get for each action. Pick a section to edit:",
      row: (label: string, value: number, isDefault: boolean) => `${label}: **${value}**${isDefault ? " (default)" : ""}`,
      groupHeading: (title: string) => `### ${title}`,
    },
    groups: {
      claims: "Tickets and reports",
      moderation: "Warnings and punishments",
    },
    modalTitle: (group: string) => `Point values — ${group}`,
    inputPlaceholder: (defaultValue: number) => `Default: ${defaultValue}`,
    saved: `${E.success} Point values saved.`,
    invalid: (label: string) => `${E.error} **${label}** must be a whole number from -1000 to 1000 (0 turns it off).`,
    adminOnly: `${E.error} Admins only.`,
    failed: `${E.error} Couldn't save the values. Try again.`,
  },
  {
    panel: {
      title: "## قيم النقاط",
      hint: "نقاط الإداري على كل عمل. اختر القسم للتعديل:",
      row: (label: string, value: number, isDefault: boolean) => `${label}: **${value}**${isDefault ? " (الافتراضي)" : ""}`,
      groupHeading: (title: string) => `### ${title}`,
    },
    groups: {
      claims: "التكتات والبلاغات",
      moderation: "التحذيرات والعقوبات",
    },
    modalTitle: (group: string) => `قيم النقاط — ${group}`,
    inputPlaceholder: (defaultValue: number) => `الافتراضي: ${defaultValue}`,
    saved: `${E.success} تم حفظ قيم النقاط.`,
    invalid: (label: string) => `${E.error} **${label}** لازم رقم صحيح من -1000 إلى 1000 (0 يوقفها).`,
    adminOnly: `${E.error} للأدمن بس.`,
    failed: `${E.error} ما قدرت أحفظ القيم. جرّب مرة ثانية.`,
  },
);

export const startCountMessages = bilingual(
  { saved: (start: number) => `${E.success} Counting now starts at **${start}**; the first ladder role is level **${start}**.` },
  { saved: (start: number) => `${E.success} صار العد يبدأ من **${start}**؛ أول رتبة في السلّم هي المستوى **${start}**.` },
);
