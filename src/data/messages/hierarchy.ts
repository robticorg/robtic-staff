import { emojis } from "../emojis/index.ts";
import { StaffTier } from "../../modules/configuration/types/enums.ts";

const E = emojis;

export const STAFF_TIER_LABELS: Record<StaffTier, string> = {
  [StaffTier.STAFF]: "اداري",
  [StaffTier.HIGHSTAFF]: "ادارة عليا",
  [StaffTier.OWNER]: "أونر",
  [StaffTier.SHIP]: "شيب",
};

export const STAFF_TIER_OPENS_LABELS: Record<StaffTier, string> = {
  [StaffTier.STAFF]: "بداية مستوى الطاقم الاداري",
  [StaffTier.HIGHSTAFF]: "بداية مستوى الادارة العليا",
  [StaffTier.OWNER]: "بداية مستوى الأونر",
  [StaffTier.SHIP]: "بداية مستوى الشيب",
};

export const hierarchyMessages = {
  scan: {
    started: `${E.loading} جاري فحص الطاقم الاداري…`,
    title: "تم فحص الطاقم الاداري بنجاح.",

    found: (count: number) => `تم العثور على: **${count}** عضو`,
    created: (count: number) => `تمت إضافة: **${count}**`,
    updated: (count: number) => `تم تحديث: **${count}**`,
    unchanged: (count: number) => `بدون تغيير: **${count}**`,
    errors: (count: number) => `أخطاء: **${count}**`,
    invalid: (count: number) =>
      `إعداد ناقص: **${count}** — عندهم رتبة الطاقم الاداري بس ما عندهم رتبة ادارية مرقّمة.`,
    invalidHint: "راجع ترتيب رتب الطاقم الاداري أو أعطهم رتبة مرقّمة ثم أعد الفحص.",
    invalidSample: (mentions: string) => `منهم: ${mentions}`,
    nothingFound: "ما فيه ولا عضو عنده رتبة الطاقم الاداري حالياً.",
    note: "الفحص يحدّث المستوى الحالي بس — النقاط والتحذيرات والسجل ما تتغير.",

    inProgress: `${E.warning} فيه فحص شغّال حالياً لهذا السيرفر. انتظر لين يخلص.`,
    staffRoleUnset: `${E.error} رتبة الطاقم الاداري العامة مو مضبوطة. شغّل \`/role set type:رتبة الطاقم الاداري العامة role:@role\` أول.`,
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
    ignoredNote: "هذي الرتبة مستثناة من حساب مستويات الطاقم الاداري.",
    outside: "ليست ضمن مستويات الطاقم الاداري",
    outsideNote: "هذي الرتبة مو داخلة في سلّم رتب الطاقم الاداري.",
    isStart: "بداية سلّم الطاقم الاداري",
    isEnd: "نهاية سلّم الطاقم الاداري (أعلى مستوى)",
  },

  boundary: {
    configured: (label: string) => `تم ضبط بداية مستوى ${label}.`,
    notOnLadder: `${E.error} لازم تكون الرتبة ضمن سلّم رتب الطاقم الاداري المرقّمة. اضبط السلّم عن طريق \`/role set type:رتبة بداية الطاقم الاداري\` و \`/role set type:رتبة نهاية الطاقم الاداري\` أول.`,
    outOfOrder: `${E.error} رتبة الشيب لازم تكون بعد رتبة الأونر وقبل نهاية مستويات الطاقم الاداري، والادارة العليا قبلهم.`,
    note: "هذي الرتبة تظل رتبة ادارية عادية — بس صارت أول رتبة في هذا التصنيف.",
  },

  problems: {
    heading: `${E.error} إعدادات سلّم الطاقم الاداري ناقصة أو غير صحيحة:`,
    START_NOT_CONFIGURED: "رتبة البداية مو مضبوطة — شغّل `/role set type:رتبة بداية الطاقم الاداري`.",
    END_NOT_CONFIGURED: "رتبة النهاية مو مضبوطة — شغّل `/role set type:رتبة نهاية الطاقم الاداري`.",
    STAFF_ROLE_NOT_CONFIGURED: "رتبة الطاقم الاداري العامة مو مضبوطة — شغّل `/role set type:رتبة الطاقم الاداري العامة`.",
    BOUNDARY_NOT_ON_LADDER: (label: string) =>
      `رتبة بداية ${label} ما عادت ضمن السلّم المرقّم — أعد ضبطها.`,
    BOUNDARY_OUT_OF_ORDER: (label: string) =>
      `رتبة بداية ${label} ترتيبها غلط — لازم تكون فوق التصنيف اللي قبلها.`,
  },
} as const;
