import { emojis } from "../emojis/index.ts";

const E = emojis;
const relative = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;

export const giveawayMessages = {
  giveaway: {
    usage: `${E.warning} الطريقة: \`!giveaway <آيدي-رسالة-القيف-أواي>\``,
    adminOnly: `${E.error} هذا الأمر للأدمن بس.`,
    notFound: `${E.error} ما لقيت رسالة بهذا الآيدي في رومات السيرفر.`,
    notBot: `${E.error} هذي الرسالة مو من بوت قيف أواي.`,
    noEmbed: `${E.error} هذي الرسالة ما فيها إمبد قيف أواي.`,
    noEndTime: `${E.error} ما لقيت وقت النهاية (\`Ends:\`) في الإمبد.`,
    alreadyEnded: `${E.error} هذا القيف أواي منتهي أصلاً.`,
    alreadyRegistered: `${E.warning} هذا القيف أواي مسجّل من قبل.`,
    registered: (channelId: string, endsAt: Date, botId: string) =>
      [
        `${E.success} تم تسجيل القيف أواي.`,
        `**الروم:** <#${channelId}>`,
        `**ينتهي:** ${relative(endsAt)}`,
        `**البوت:** <@${botId}>`,
        "-# الستاف يقدرون الحين يستخدمون `!done @عضو` لكل عضو ينفّذ الشرط.",
      ].join("\n"),
  },

  done: {
    usage: `${E.warning} الطريقة: \`!done @عضو\` — أو لقيف أواي معيّن: \`!done @عضو <آيدي-الرسالة>\``,
    notStaff: `${E.error} هذا الأمر للستاف بس.`,
    bot: `${E.error} البوتات ما تشارك في القيف أواي.`,
    saved: (userId: string, channelId: string, endsAt: Date) =>
      `${E.success} تم تسجيل إن <@${userId}> نفّذ شرط القيف أواي في <#${channelId}> (ينتهي ${relative(endsAt)}).`,
    alreadySaved: (userId: string) => `${E.warning} <@${userId}> مسجّل من قبل إنه نفّذ الشرط.`,
  },

  result: {
    title: "## 🎉 نتيجة شرط القيف أواي",
    proved: (userId: string, staffId: string) => `${E.success} <@${userId}> أثبت إنه نفّذ الشرط — سجّله <@${staffId}>.`,
    notProved: (userId: string) => `${E.error} <@${userId}> ما أثبت إنه نفّذ الشرط.`,
    footer: (count: number) => `-# عدد اللي سجّلهم الستاف: ${count}`,
  },
} as const;
