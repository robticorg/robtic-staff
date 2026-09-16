import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { formatArabicDuration } from "./duration.ts";
import type { StaffTagRestorationReason } from "../../modules/server-tag/types/enums.ts";

const E = emojis;

/** Exhaustive so a new reason cannot ship without Arabic copy. */
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

  /** Plain text, no emoji — matches the DM style used across the project. */
  dm: {
    restricted: (durationMs: number, expiresAt: Date) =>
      [
        `شلت تاق السيرفر من حسابك في **${branding.communityName}**، ولهذا تم سحب رتب الستاف منك مؤقتاً لمدة **${formatArabicDuration(durationMs)}**.`,
        "",
        "إذا رجعت تستخدم تاق السيرفر خلال هذي المدة، رتب الستاف حقك ترجع لك تلقائياً على طول.",
        "",
        `وإذا ما رجعت، التقييد ينتهي بنفسه ${relative(expiresAt)} وترجع لك رتبك.`,
      ].join("\n"),

    restoredByTag: "رجعت تستخدم تاق السيرفر، وتمت إعادة رتب الستاف الخاصة بك.",

    restoredByExpiry: "انتهت مدة التقييد وتمت إعادة رتب الستاف الخاصة بك.",

    partialRestoreNote:
      "ملاحظة: فيه رتب محفوظة ما عادت موجودة في السيرفر، فتم تجاوزها.",
  },

  /**
   * Log-channel copy. Same shape as the punishment / vacation cards:
   * a heading followed by `**label:** value` lines.
   */
  log: {
    headings: {
      tagEnabled: `${E.success} **تاق السيرفر — تفعيل**`,
      tagDisabled: `${E.info} **تاق السيرفر — إزالة**`,
      restricted: `${E.staff} **تقييد رتب الستاف بسبب التاق**`,
      restored: `${E.success} **إعادة رتب الستاف**`,
      blocked: `${E.warning} **تعذّرت إعادة رتب الستاف**`,
      problem: `${E.error} **مشكلة في نظام تاق السيرفر**`,
    },

    line: (label: string, value: string) => `**${label}:** ${value}`,
    target: (userId: string) => `<@${userId}> (\`${userId}\`)`,
    roles: (roleIds: readonly string[]) =>
      roleIds.length > 0 ? roleIds.map((id) => `<@&${id}>`).join("، ") : "—",
    none: "—",
    relative,
    absolute,

    labels: {
      member: "العضو",
      tagRole: "رتبة التاق",
      savedRoles: "الرتب المحفوظة",
      removedRoles: "الرتب المسحوبة",
      restoredRoles: "الرتب المرجّعة",
      missingRoles: "رتب محذوفة تم تجاوزها",
      blockedRoles: "رتب فوق مستوى البوت",
      duration: "المدة",
      expiresAt: "ينتهي",
      reason: "السبب",
      staffStatus: "حالة الستاف",
      detail: "التفاصيل",
      result: "النتيجة",
    },

    /** Why a restriction closed. */
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
