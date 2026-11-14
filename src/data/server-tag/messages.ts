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
      awaitingIdentity: `You have been accepted to the staff of **${S}**. Your roles will be given once you add the server tag or ${IDS} to your name.`,
      grantedAfterAccept: "Tag or identifier found. You now have your staff roles. Welcome aboard!",
      partialRestoreNote: "Note: some saved roles no longer exist in the server and were skipped.",
    },

    notice: {
      awaitingIdentity: (userId: string, dmSent: boolean) =>
        `${E.success} <@${userId}> has been accepted to the staff. Roles will be given once they add the server tag or identifier.` +
        (dmSent ? "" : " (DMs closed, please inform them.)"),
    },
  },
  {
    serverName: S,

    dm: {
      restricted: (durationMs: number, _expiresAt: Date) =>
        `تم إيقاف رتبك الإدارية في **${S}** مؤقتاً. يرجى وضع الشعار أو التاق ${IDS} في اسمك خلال **${formatArabicDuration(durationMs)}** لاستعادتها، وإلا سيتم فصلك من الطاقم وتصفير نقاطك.`,
      restoredByTag: "تم التحقق من شعار السيرفر، وأُعيدت إليك رتبك الإدارية.",
      restoredByDisplayName: "تم التحقق من التاق في اسمك، وأُعيدت إليك رتبك الإدارية.",
      removedByExpiry: `انتهت المهلة دون وضع الشعار أو التاق، لذا تم فصلك من طاقم **${S}** وتصفير نقاطك. يمكنك التقديم مجدداً في أي وقت.`,
      awaitingIdentity: `تم قبولك في إدارة **${S}**، وستُمنح لك الرتب بعد وضع الشعار أو التاق ${IDS} في اسمك.`,
      grantedAfterAccept: "تم التحقق من الشعار أو التاق، ومُنحت لك رتبك الإدارية. أهلاً بك في الطاقم.",
      partialRestoreNote: "ملاحظة: بعض الرتب المحفوظة لم تعد موجودة في السيرفر وتم تجاوزها.",
    },

    notice: {
      awaitingIdentity: (userId: string, dmSent: boolean) =>
        `${E.success} تم قبول <@${userId}> في الإدارة، وستُمنح له الرتب بعد وضع الشعار أو التاق.` +
        (dmSent ? "" : " (رسائله الخاصة مغلقة، يرجى إبلاغه.)"),
    },
  },
);
