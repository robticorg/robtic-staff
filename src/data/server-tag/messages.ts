import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { formatArabicDuration } from "./duration.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const S = branding.communityName;
/** The identifiers that count, as shown to people. */
const IDS = `\`${S}\` / \`RTC\` / \`RC\``;

export const serverTagMessages = bilingual(
  {
    serverName: S,

    dm: {
      restricted: (durationMs: number, _expiresAt: Date) =>
        `Your staff roles in **${S}** are on hold: wear the server tag or add ${IDS} to your name within **${formatArabicDuration(durationMs)}** to get them back. After that you're removed from staff and your points are reset.`,
      restoredByTag: "You're wearing the server tag again. Your staff roles are back.",
      restoredByDisplayName: "Your name has the server identifier now. Your staff roles are back.",
      removedByExpiry: `Time's up: no server tag or identifier, so you've been removed from staff in **${S}** and your points were reset. You can apply again anytime.`,
      awaitingIdentity: `You're accepted to the staff of **${S}**. You'll get your roles once you wear the server tag or add ${IDS} to your name.`,
      grantedAfterAccept: "Tag or identifier found. You now have your staff roles. Welcome aboard!",
      partialRestoreNote: "Note: some saved roles no longer exist in the server and were skipped.",
    },

    notice: {
      awaitingIdentity: (userId: string, dmSent: boolean) =>
        `${E.warning} <@${userId}> is accepted. They'll get their roles after wearing the tag or adding the identifier.` +
        (dmSent ? "" : " (Their DMs are closed, please let them know.)"),
    },
  },
  {
    serverName: S,

    dm: {
      restricted: (durationMs: number, _expiresAt: Date) =>
        `رتبك الإدارية في **${S}** موقوفة مؤقتاً: البس الشعار أو حط ${IDS} في اسمك خلال **${formatArabicDuration(durationMs)}** وترجع لك. بعدها تنشال من الطاقم وتتصفّر نقاطك.`,
      restoredByTag: "رجعت تلبس شعار السيرفر، ورجعت لك رتبك الإدارية.",
      restoredByDisplayName: "صار اسمك فيه معرّف السيرفر، ورجعت لك رتبك الإدارية.",
      removedByExpiry: `انتهت المهلة بدون شعار أو معرّف، فتم شيلك من الطاقم في **${S}** وتصفير نقاطك. تقدر تقدّم من جديد متى ما حبيت.`,
      awaitingIdentity: `تم قبولك في طاقم **${S}**. بتوصلك رتبك بعد ما تلبس الشعار أو تحط ${IDS} في اسمك.`,
      grantedAfterAccept: "تم التحقق من الشعار أو المعرّف، واستلمت رتبك الإدارية. حياك!",
      partialRestoreNote: "ملاحظة: بعض الرتب المحفوظة ما عادت موجودة في السيرفر وتم تجاوزها.",
    },

    notice: {
      awaitingIdentity: (userId: string, dmSent: boolean) =>
        `${E.warning} تم قبول <@${userId}>، وبتوصله رتبه بعد ما يلبس الشعار أو يحط المعرّف.` +
        (dmSent ? "" : " (الخاص مقفل، بلّغوه.)"),
    },
  },
);
