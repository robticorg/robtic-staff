import { emojis } from "../emojis/index.ts";

const E = emojis;

export const fastAccessMessages = {
  managerOnly: `${E.error} إدارة ماكروهات Fast Access لمانجرات الستاف بس.`,
  invalidCommand: `${E.error} الأمر لازم يكون من 1 إلى 32 حرف من a-z و 0-9 و \`-\` أو \`_\`.`,
  emptyMessage: `${E.error} الرسالة ما تقدر تكون فاضية.`,
  invalidContext: `${E.error} المكان لازم يكون MODMAIL أو SUPPORT.`,
  alreadyExists: (command: string) => `${E.error} \`$${command}\` موجود من قبل في هذا السيرفر.`,
  created: (command: string, context: string) =>
    `${E.success} تم إنشاء \`$${command}\` لـ **${context}**.`,
  notFound: (command: string) => `${E.error} \`$${command}\` مو موجود.`,
  removed: (command: string) => `${E.success} تم حذف \`$${command}\`.`,
  listTitle: "**ماكروهات Fast Access**",
  listEmpty: "ما فيه ولا ماكرو Fast Access مضاف لحد الآن.",
  listLine: (command: string, context: string, enabled: boolean) =>
    `\`$${command}\` · المكان: ${context} · الحالة: ${enabled ? "مفعّل" : "متوقف"}`,
} as const;
