import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const relative = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;

export const giveawayMessages = bilingual(
  {
    giveaway: {
      usage: `${E.warning} Usage: \`!giveaway <giveaway message link>\` (best) or \`!giveaway <message ID>\``,
      adminOnly: `${E.error} Admins only.`,
      notFound: `${E.error} Couldn't reach the message. Send its **message link**, and make sure I can see the channel with **Read Message History**.`,
      notBot: `${E.error} That message isn't from a giveaway bot.`,
      noEndTime: `${E.error} Couldn't find the giveaway's end time (\`Ends:\` or the embed time).`,
      alreadyEnded: `${E.error} That giveaway already ended.`,
      alreadyRegistered: `${E.warning} That giveaway is already registered.`,
      registered: (channelId: string, endsAt: Date, botId: string) =>
        [`${E.success} Giveaway registered in <#${channelId}>, ends ${relative(endsAt)} (<@${botId}>).`, "-# Staff can now use `!done @member` for each member who meets the condition."].join("\n"),
    },

    done: {
      usage: `${E.warning} Usage: \`!done @member\`, or \`!done\` inside a ticket (for its owner). Add a giveaway's message ID to pick one.`,
      notStaff: `${E.error} Staff only.`,
      bot: `${E.error} Bots don't take part in giveaways.`,
      saved: (userId: string, channelId: string, endsAt: Date) => `${E.success} <@${userId}> met the giveaway condition in <#${channelId}> (ends ${relative(endsAt)}).`,
      alreadySaved: (userId: string) => `${E.warning} <@${userId}> is already recorded.`,
      pickTitle: (userId: string) => `### 🎉 Which giveaway did <@${userId}> qualify for?`,
      pickPlaceholder: "Choose the giveaway",
      optionLabel: (title: string | null, index: number) => title ?? `Giveaway ${index}`,
      optionDescription: (channelName: string | null, endsAt: string) => `${channelName ? `#${channelName} · ` : ""}ends ${endsAt}`,
      notAuthor: `${E.error} This menu is for whoever ran the command.`,
      giveawayGone: `${E.error} That giveaway is no longer active.`,
    },

    result: {
      title: "## 🎉 Giveaway condition",
      proved: (userId: string, staffId: string) => `${E.success} <@${userId}> met the condition (recorded by <@${staffId}>).`,
      notProved: (userId: string) => `${E.error} <@${userId}> didn't prove they met the condition.`,
      footer: (count: number) => `-# Recorded by staff: ${count}`,
    },
  },
  {
    giveaway: {
      usage: `${E.warning} الطريقة: \`!giveaway <رابط-رسالة-القيف-أواي>\` (الأفضل) أو \`!giveaway <آيدي-الرسالة>\``,
      adminOnly: `${E.error} للأدمن بس.`,
      notFound: `${E.error} ما قدرت أوصل للرسالة. أرسل **رابط الرسالة**، وتأكد إني أشوف الروم وعندي **Read Message History**.`,
      notBot: `${E.error} الرسالة مو من بوت قيف أواي.`,
      noEndTime: `${E.error} ما لقيت وقت نهاية القيف أواي (\`Ends:\` أو وقت الإمبد).`,
      alreadyEnded: `${E.error} القيف أواي منتهي.`,
      alreadyRegistered: `${E.warning} القيف أواي مسجّل أصلاً.`,
      registered: (channelId: string, endsAt: Date, botId: string) =>
        [`${E.success} تم تسجيل القيف أواي في <#${channelId}>، ينتهي ${relative(endsAt)} (<@${botId}>).`, "-# الطاقم يقدرون يستخدمون `!done @عضو` لكل عضو ينفّذ الشرط."].join("\n"),
    },

    done: {
      usage: `${E.warning} الطريقة: \`!done @عضو\`، أو \`!done\` داخل التكت (لصاحبه). أضف آيدي رسالة القيف أواي لاختيار واحد.`,
      notStaff: `${E.error} للطاقم بس.`,
      bot: `${E.error} البوتات ما تشارك في القيف أواي.`,
      saved: (userId: string, channelId: string, endsAt: Date) => `${E.success} <@${userId}> نفّذ شرط القيف أواي في <#${channelId}> (ينتهي ${relative(endsAt)}).`,
      alreadySaved: (userId: string) => `${E.warning} <@${userId}> مسجّل أصلاً.`,
      pickTitle: (userId: string) => `### 🎉 أي قيف أواي نفّذ <@${userId}> شرطه؟`,
      pickPlaceholder: "اختر القيف أواي",
      optionLabel: (title: string | null, index: number) => title ?? `قيف أواي ${index}`,
      optionDescription: (channelName: string | null, endsAt: string) => `${channelName ? `#${channelName} · ` : ""}ينتهي ${endsAt}`,
      notAuthor: `${E.error} القائمة لصاحب الأمر بس.`,
      giveawayGone: `${E.error} القيف أواي ما عاد نشط.`,
    },

    result: {
      title: "## 🎉 نتيجة شرط القيف أواي",
      proved: (userId: string, staffId: string) => `${E.success} <@${userId}> نفّذ الشرط (سجّله <@${staffId}>).`,
      notProved: (userId: string) => `${E.error} <@${userId}> ما أثبت تنفيذ الشرط.`,
      footer: (count: number) => `-# سجّلهم الطاقم: ${count}`,
    },
  },
);
