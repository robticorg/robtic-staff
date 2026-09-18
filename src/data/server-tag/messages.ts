import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { formatArabicDuration } from "./duration.ts";
import type { StaffTagRestorationReason } from "../../modules/server-tag/types/enums.ts";

const E = emojis;

const RESTORATION_REASON_LABELS: Record<StaffTagRestorationReason, string> = {
  TAG_REAPPLIED: "رجع يستخدم تاق السيرفر",
  DURATION_EXPIRED: "انتهت مدة التقييد",
  STAFF_LIFECYCLE: "تغيّرت حالته في نظام الستاف",
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
        `شلت تاق السيرفر من حسابك في **${branding.communityName}**، ولهذا تم سحب رتب الستاف منك مؤقتاً لمدة **${formatArabicDuration(durationMs)}**.`,
        "",
        "إذا رجعت تستخدم تاق السيرفر خلال هذي المدة، رتب الستاف حقك ترجع لك تلقائياً على طول.",
        "",
        "وإذا ما رجعت التاق قبل ما تنتهي المدة، راح تنشال من الستاف نهائياً وتروح نقاطك كلها.",
      ].join("\n"),

    restoredByTag: "رجعت تستخدم تاق السيرفر، وتمت إعادة رتب الستاف الخاصة بك.",

    removedByExpiry: [
      `انتهت مدة التقييد وما رجعت تاق السيرفر لحسابك في **${branding.communityName}**.`,
      "",
      "تم شيلك من الستاف نهائياً، ورتب الستاف حقك ما راح ترجع، ونقاطك تم تصفيرها.",
      "",
      "إذا تبي ترجع للستاف، لازم تقدّم من جديد.",
    ].join("\n"),

    partialRestoreNote:
      "ملاحظة: فيه رتب محفوظة ما عادت موجودة في السيرفر، فتم تجاوزها.",
  },

  log: {
    headings: {
      tagEnabled: `${E.success} **تاق السيرفر — تفعيل**`,
      tagDisabled: `${E.info} **تاق السيرفر — إزالة**`,
      restricted: `${E.staff} **تقييد رتب الستاف بسبب التاق**`,
      restored: `${E.success} **إعادة رتب الستاف**`,
      removed: `${E.error} **شيل من الستاف — انتهت مدة التاق**`,
      blocked: `${E.warning} **تعذّرت إعادة رتب الستاف**`,
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
      staffStatus: "حالة الستاف",
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
      tagRoleNotConfigured: "رتبة التاق مو مضبوطة. شغّل `/role tag @role`.",
      tagRoleMissing: "رتبة التاق المضبوطة ما عادت موجودة. أعد تشغيل `/role tag`.",
      hierarchy: "ما أقدر أدير هذي الرتب — رتبتي لازم تكون فوقها.",
      memberGone: "العضو مو موجود في السيرفر حالياً — التقييد محفوظ لين يرجع أو تنتهي مدته.",
      restoreFailed: "فشلت إعادة رتب الستاف — راجع صلاحيات البوت وترتيب الرتب.",
    },
  },
} as const;
