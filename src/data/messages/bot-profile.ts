import { emojis } from "../emojis/index.ts";

const E = emojis;

export const botProfileMessages = {
  modal: {
    title: "بروفايل البوت في هذا السيرفر",
    avatar: "اللوقو",
    banner: "البنر",
    imageHint: "PNG أو JPG أو GIF أو WEBP، حتى 10 ميقا. خلّه فاضي عشان يبقى الحالي.",
    nick: "الاسم (النك نيم)",
    nickHint: "اسمه في هذا السيرفر. امسحه عشان يرجع لاسم البوت الأصلي.",
    bio: "البايو",
    bioHint: "النبذة حقه في هذا السيرفر. خلّه فاضي عشان يبقى الحالي.",
  },
  field: { avatar: "اللوقو", banner: "البنر", nick: "الاسم", bio: "البايو" },
  adminOnly: `${E.error} تعديل بروفايل البوت للأدمن بس.`,
  badImage: (what: string) => `${E.error} ${what} لازم يكون صورة PNG أو JPG أو GIF أو WEBP.`,
  tooBig: (what: string) => `${E.error} ${what} أكبر من 10 ميقا.`,
  refused: (reason: string) => `${E.error} ديسكورد رفض التعديل: ${reason}`,
  saved: (fields: string[]) => `${E.success} تم تحديث بروفايل البوت في هذا السيرفر: ${fields.join("، ")}.`,
  nothing: `${E.warning} ما تغيّر شي.`,
} as const;
