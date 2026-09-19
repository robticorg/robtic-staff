import { emojis } from "../emojis/index.ts";
import { StaffTier } from "../../modules/configuration/types/enums.ts";

const E = emojis;

export const STAFF_TIER_LABELS: Record<StaffTier, string> = {
  [StaffTier.STAFF]: "ستاف",
  [StaffTier.HIGHSTAFF]: "هاي ستاف",
  [StaffTier.OWNER]: "أونر",
  [StaffTier.SHIP]: "شيب",
};

export const STAFF_TIER_OPENS_LABELS: Record<StaffTier, string> = {
  [StaffTier.STAFF]: "بداية مستوى الستاف",
  [StaffTier.HIGHSTAFF]: "بداية مستوى الهاي ستاف",
  [StaffTier.OWNER]: "بداية مستوى الأونر",
  [StaffTier.SHIP]: "بداية مستوى الشيب",
};

export const hierarchyMessages = {
  scan: {
    started: `${E.loading} جاري فحص الستاف…`,
    title: "تم فحص الستاف بنجاح.",

    found: (count: number) => `تم العثور على: **${count}** عضو`,
    created: (count: number) => `تمت إضافة: **${count}**`,
    updated: (count: number) => `تم تحديث: **${count}**`,
    unchanged: (count: number) => `بدون تغيير: **${count}**`,
    errors: (count: number) => `أخطاء: **${count}**`,
    invalid: (count: number) =>
      `إعداد ناقص: **${count}** — عندهم رتبة الستاف بس ما عندهم رتبة ستاف مرقّمة.`,
    invalidHint: "راجع ترتيب رتب الستاف أو أعطهم رتبة مرقّمة ثم أعد الفحص.",
    invalidSample: (mentions: string) => `منهم: ${mentions}`,
    nothingFound: "ما فيه ولا عضو عنده رتبة الستاف حالياً.",
    note: "الفحص يحدّث المستوى الحالي بس — النقاط والتحذيرات والسجل ما تتغير.",

    inProgress: `${E.warning} فيه فحص شغّال حالياً لهذا السيرفر. انتظر لين يخلص.`,
    staffRoleUnset: `${E.error} رتبة الستاف العامة مو مضبوطة. شغّل \`/role set type:رتبة الستاف العامة role:@role\` أول.`,
    failed: `${E.error} ما قدرت أكمل الفحص. جرب مرة ثانية.`,
  },

  roleCheck: {
    title: "معلومات الرتبة",
    role: (roleId: string) => `الرتبة: <@&${roleId}>`,
    level: (level: number) => `المستوى: **${level}**`,
    noLevel: "المستوى: لا يوجد",
    tier: (label: string) => `التصنيف: **${label}**`,
    status: (text: string) => `الحالة: ${text}`,

    ignored: "مستثناة",
    ignoredNote: "هذي الرتبة مستثناة من حساب مستويات الستاف.",
    outside: "ليست ضمن مستويات الستاف",
    outsideNote: "هذي الرتبة مو داخلة في سلّم رتب الستاف.",
    isStart: "بداية سلّم الستاف",
    isEnd: "نهاية سلّم الستاف (أعلى مستوى)",
  },

  boundary: {
    configured: (label: string) => `تم ضبط بداية مستوى ${label}.`,
    notOnLadder: `${E.error} لازم تكون الرتبة ضمن سلّم رتب الستاف المرقّمة. اضبط السلّم عن طريق \`/role set type:رتبة بداية الستاف\` و \`/role set type:رتبة نهاية الستاف\` أول.`,
    outOfOrder: `${E.error} رتبة الشيب لازم تكون بعد رتبة الأونر وقبل نهاية مستويات الستاف، والهاي ستاف قبلهم.`,
    note: "هذي الرتبة تظل رتبة ستاف عادية — بس صارت أول رتبة في هذا التصنيف.",
  },

  problems: {
    heading: `${E.error} إعدادات سلّم الستاف ناقصة أو غير صحيحة:`,
    START_NOT_CONFIGURED: "رتبة البداية مو مضبوطة — شغّل `/role set type:رتبة بداية الستاف`.",
    END_NOT_CONFIGURED: "رتبة النهاية مو مضبوطة — شغّل `/role set type:رتبة نهاية الستاف`.",
    STAFF_ROLE_NOT_CONFIGURED: "رتبة الستاف العامة مو مضبوطة — شغّل `/role set type:رتبة الستاف العامة`.",
    BOUNDARY_NOT_ON_LADDER: (label: string) =>
      `رتبة بداية ${label} ما عادت ضمن السلّم المرقّم — أعد ضبطها.`,
    BOUNDARY_OUT_OF_ORDER: (label: string) =>
      `رتبة بداية ${label} ترتيبها غلط — لازم تكون فوق التصنيف اللي قبلها.`,
  },
} as const;
