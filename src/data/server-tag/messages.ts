import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { formatArabicDuration } from "./duration.ts";
import type { StaffTagRestorationReason } from "../../modules/server-tag/types/enums.ts";

const E = emojis;

const RESTORATION_REASON_LABELS: Record<StaffTagRestorationReason, string> = {
  TAG_REAPPLIED: "رجع يستخدم تاق السيرفر",
  DISPLAY_NAME_COMPLIANT: "صار اسمه في السيرفر فيه معرّف السيرفر",
  DURATION_EXPIRED: "انتهت مدة التقييد",
  STAFF_LIFECYCLE: "تغيّرت حالته في نظام الطاقم الاداري",
  MANUAL: "إجراء يدوي",
};

function relative(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

function absolute(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

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

  log: {
    headings: {
      tagEnabled: `${E.success} **تاق السيرفر — تفعيل**`,
      tagDisabled: `${E.info} **تاق السيرفر — إزالة**`,
      restricted: `${E.staff} **تقييد رتب الطاقم الاداري — لا تاق ولا معرّف في الاسم**`,
      awaitingIdentity: `${E.staff} **قبول في الطاقم الاداري — الرتب معلّقة لين يلبس التاق أو يحط المعرّف**`,
      restored: `${E.success} **إعادة رتب الطاقم الاداري**`,
      removed: `${E.error} **شيل من الطاقم الاداري — انتهت مدة التاق**`,
      blocked: `${E.warning} **تعذّرت إعادة رتب الطاقم الاداري**`,
      problem: `${E.error} **مشكلة في نظام تاق السيرفر**`,
    },

    line: (label: string, value: string) => `**${label}:** ${value}`,
    target: (userId: string) => `<@${userId}> (\`${userId}\`)`,
    none: "—",
    relative,
    absolute,

    labels: {
      member: "العضو",
      tagRole: "رتبة التاق",
      duration: "المدة",
      expiresAt: "ينتهي",
      reason: "السبب",
      staffStatus: "حالة الطاقم الاداري",
      detail: "التفاصيل",
      result: "النتيجة",
      pointsWiped: "النقاط المصفّرة",
    },

    reasons: RESTORATION_REASON_LABELS,

    staffStatus: {
      ACTIVE: "نشط",
      BREAK: "في بريك",
      FIRED: "مفصول",
      BLACKLISTED: "بلاك ليست",
    } as Record<string, string>,

    results: {
      granted: "تم إعطاء رتبة التاق",
      removed: "تم سحب رتبة التاق",
      restoreFailed: "ديسكورد رفض إرجاع الرتب",
      partial: "تمت الإعادة مع تجاوز بعض الرتب",
      done: "تمت بنجاح",
    },

    problems: {
      botMissingPermission: "ناقصني صلاحية **Manage Roles** — نظام تاق السيرفر متوقف.",
      tagRoleNotConfigured: "رتبة التاق مو مضبوطة. شغّل `/role set type:رتبة التاق role:@role`.",
      tagRoleMissing: "رتبة التاق المضبوطة ما عادت موجودة. أعد تشغيل `/role set type:رتبة التاق`.",
      hierarchy: "ما أقدر أدير هذي الرتب — رتبتي لازم تكون فوقها.",
      memberGone: "العضو مو موجود في السيرفر حالياً — التقييد محفوظ لين يرجع أو تنتهي مدته.",
      restoreFailed: "فشلت إعادة رتب الطاقم الاداري — راجع صلاحيات البوت وترتيب الرتب.",
    },
  },
} as const;
