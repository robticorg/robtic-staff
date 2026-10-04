import { emojis } from "../emojis/index.ts";

const E = emojis;
const relative = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;

export const giveawayMessages = {
  giveaway: {
    usage: `${E.warning} الطريقة: \`!giveaway <رابط-رسالة-القيف-أواي>\` (الأفضل) أو \`!giveaway <آيدي-الرسالة>\``,
    adminOnly: `${E.error} هذا الأمر للأدمن بس.`,
    notFound: `${E.error} ما قدرت أوصل للرسالة. أرسل **رابط الرسالة** (Copy Message Link)، وتأكد إن البوت يقدر يشوف الروم وعنده صلاحية **Read Message History** فيه.`,
    notBot: `${E.error} هذي الرسالة مو من بوت قيف أواي.`,
    noEndTime: `${E.error} ما لقيت وقت نهاية القيف أواي في الرسالة (\`Ends:\` أو وقت الإمبد).`,
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
    usage: `${E.warning} الطريقة: \`!done @عضو\` — وداخل التكت: \`!done\` (لصاحب التكت) — ولقيف أواي معيّن أضف آيدي رسالته.`,
    notStaff: `${E.error} هذا الأمر للستاف بس.`,
    bot: `${E.error} البوتات ما تشارك في القيف أواي.`,
    saved: (userId: string, channelId: string, endsAt: Date) =>
      `${E.success} تم تسجيل إن <@${userId}> نفّذ شرط القيف أواي في <#${channelId}> (ينتهي ${relative(endsAt)}).`,
    alreadySaved: (userId: string) => `${E.warning} <@${userId}> مسجّل من قبل إنه نفّذ الشرط.`,
    pickTitle: (userId: string) => `### 🎉 أي قيف أواي نفّذ <@${userId}> شرطه؟`,
    pickPlaceholder: "اختر القيف أواي",
    optionLabel: (title: string | null, index: number) => title ?? `قيف أواي ${index}`,
    optionDescription: (channelName: string | null, endsAt: string) =>
      `${channelName ? `#${channelName} · ` : ""}ينتهي ${endsAt}`,
    notAuthor: `${E.error} هذي القائمة لصاحب الأمر بس.`,
    giveawayGone: `${E.error} هذا القيف أواي ما عاد نشط.`,
  },

  result: {
    title: "## 🎉 نتيجة شرط القيف أواي",
    proved: (userId: string, staffId: string) => `${E.success} <@${userId}> أثبت إنه نفّذ الشرط — سجّله <@${staffId}>.`,
    notProved: (userId: string) => `${E.error} <@${userId}> ما أثبت إنه نفّذ الشرط.`,
    footer: (count: number) => `-# عدد اللي سجّلهم الستاف: ${count}`,
  },
} as const;
