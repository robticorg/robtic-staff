import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const botProfileMessages = bilingual(
  {
    modal: {
      title: "The bot's profile in this server",
      avatar: "Avatar",
      banner: "Banner",
      imageHint: "PNG, JPG, GIF or WEBP, up to 10 MB. Leave empty to keep the current one.",
      nick: "Name (nickname)",
      nickHint: "Its name in this server. Clear it to go back to the bot's own name.",
      bio: "Bio",
      bioHint: "Its bio in this server. Leave empty to keep the current one.",
    },
    field: { avatar: "avatar", banner: "banner", nick: "name", bio: "bio" },
    adminOnly: `${E.error} Only admins can edit the bot's profile.`,
    badImage: (what: string) => `${E.error} The ${what} must be a PNG, JPG, GIF or WEBP image.`,
    tooBig: (what: string) => `${E.error} The ${what} is over 10 MB.`,
    refused: (reason: string) => `${E.error} Discord refused the change: ${reason}`,
    saved: (fields: string[]) => `${E.success} Bot profile updated here: ${fields.join(", ")}.`,
    nothing: `${E.warning} Nothing changed.`,
  },
  {
    modal: {
      title: "بروفايل البوت في هذا السيرفر",
      avatar: "الصورة",
      banner: "البنر",
      imageHint: "PNG أو JPG أو GIF أو WEBP، حتى 10 ميقا. فاضي = يبقى الحالي.",
      nick: "الاسم (النك نيم)",
      nickHint: "اسمه في هذا السيرفر. امسحه يرجع لاسم البوت الأصلي.",
      bio: "البايو",
      bioHint: "نبذته في هذا السيرفر. فاضي = يبقى الحالي.",
    },
    field: { avatar: "الصورة", banner: "البنر", nick: "الاسم", bio: "البايو" },
    adminOnly: `${E.error} تعديل البروفايل للأدمن بس.`,
    badImage: (what: string) => `${E.error} ${what} لازم صورة PNG أو JPG أو GIF أو WEBP.`,
    tooBig: (what: string) => `${E.error} ${what} أكبر من 10 ميقا.`,
    refused: (reason: string) => `${E.error} ديسكورد رفض التعديل: ${reason}`,
    saved: (fields: string[]) => `${E.success} تم تحديث بروفايل البوت هنا: ${fields.join("، ")}.`,
    nothing: `${E.warning} ما تغيّر شيء.`,
  },
);
