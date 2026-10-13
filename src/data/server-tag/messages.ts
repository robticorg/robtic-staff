import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { formatArabicDuration } from "./duration.ts";

const E = emojis;

export const serverTagMessages = {
  serverName: branding.communityName,

  dm: {
    restricted: (durationMs: number, expiresAt: Date) =>
      [
        `حسابك ما عليه تاق السيرفر، واسمك في **${branding.communityName}** ما فيه معرّف السيرفر، ولهذا تم سحب رتب الطاقم الاداري منك مؤقتاً لمدة **${formatArabicDuration(durationMs)}**.`,
        "",
        `إذا رجعت تستخدم تاق السيرفر، أو حطيت \`${branding.communityName}\` أو \`RTC\` أو \`RC\` في اسمك بالسيرفر خلال هذي المدة، رتب الطاقم الاداري حقك ترجع لك تلقائياً على طول.`,
        "",
        "وإذا ما رجعت وحدة منهم قبل ما تنتهي المدة، راح تنشال من الطاقم الاداري نهائياً وتروح نقاطك كلها.",
      ].join("\n"),

    restoredByTag: "رجعت تستخدم تاق السيرفر، وتمت إعادة رتب الطاقم الاداري الخاصة بك.",

    restoredByDisplayName: "صار اسمك في السيرفر فيه معرّف السيرفر، وتمت إعادة رتب الطاقم الاداري الخاصة بك.",

    removedByExpiry: [
      `انتهت مدة التقييد وما رجعت تاق السيرفر لحسابك ولا حطيت معرّف السيرفر في اسمك في **${branding.communityName}**.`,
      "",
      "تم شيلك من الطاقم الاداري نهائياً، ورتب الطاقم الاداري حقك ما راح ترجع، ونقاطك تم تصفيرها.",
      "",
      "إذا تبي ترجع للطاقم الاداري، لازم تقدّم من جديد.",
    ].join("\n"),

    awaitingIdentity: [
      `تم قبولك في الطاقم الاداري في **${branding.communityName}**، وانحفظت بياناتك كاداري.`,
      "",
      `بس رتب الطاقم الاداري ما راح تنعطى لك لين تلبس تاق السيرفر، أو تحط \`${branding.communityName}\` أو \`RTC\` أو \`RC\` في اسمك بالسيرفر.`,
      "",
      "أول ما تسوي وحدة منهم، رتبك تنعطى لك تلقائياً.",
    ].join("\n"),

    grantedAfterAccept: "لبست تاق السيرفر أو حطيت معرّف السيرفر في اسمك، وتم إعطاؤك رتب الطاقم الاداري. مبروك!",

    partialRestoreNote:
      "ملاحظة: فيه رتب محفوظة ما عادت موجودة في السيرفر، فتم تجاوزها.",
  },

  notice: {
    awaitingIdentity: (userId: string, dmSent: boolean) =>
      `${E.warning} <@${userId}> ما عليه تاق السيرفر ولا معرّف السيرفر في اسمه — انقبل وانحفظ في الطاقم الاداري، بس رتبه معلّقة لين يلبس التاق أو يحط \`${branding.communityName}\` / \`RTC\` / \`RC\` في اسمه. ` +
      (dmSent ? "تم إرسال رسالة له بالخاص." : "ما قدرت أرسل له بالخاص (الخاص مقفل) — بلّغوه بأنفسكم."),
  },

} as const;
