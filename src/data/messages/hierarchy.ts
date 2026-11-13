import { emojis } from "../emojis/index.ts";
import { StaffTier } from "../../modules/configuration/types/enums.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const STAFF_TIER_LABELS: Record<StaffTier, string> = bilingual<Record<StaffTier, string>>(
  { [StaffTier.STAFF]: "Staff", [StaffTier.HIGHSTAFF]: "High staff", [StaffTier.OWNER]: "Owner", [StaffTier.SHIP]: "Ship" },
  { [StaffTier.STAFF]: "إداري", [StaffTier.HIGHSTAFF]: "إدارة عليا", [StaffTier.OWNER]: "أونر", [StaffTier.SHIP]: "شيب" },
);

export const STAFF_TIER_OPENS_LABELS: Record<StaffTier, string> = bilingual<Record<StaffTier, string>>(
  {
    [StaffTier.STAFF]: "Start of staff levels",
    [StaffTier.HIGHSTAFF]: "Start of high staff",
    [StaffTier.OWNER]: "Start of owner levels",
    [StaffTier.SHIP]: "Start of ship levels",
  },
  {
    [StaffTier.STAFF]: "بداية مستوى الطاقم",
    [StaffTier.HIGHSTAFF]: "بداية مستوى الإدارة العليا",
    [StaffTier.OWNER]: "بداية مستوى الأونر",
    [StaffTier.SHIP]: "بداية مستوى الشيب",
  },
);

export const hierarchyMessages = bilingual(
  {
    scan: {
      started: `${E.loading} Scanning staff…`,
      title: "Staff scan done.",
      found: (count: number) => `Found: **${count}**`,
      created: (count: number) => `Added: **${count}**`,
      updated: (count: number) => `Updated: **${count}**`,
      unchanged: (count: number) => `Unchanged: **${count}**`,
      errors: (count: number) => `Errors: **${count}**`,
      invalid: (count: number) => `Incomplete: **${count}** have the staff role but no ranked role.`,
      invalidHint: "Check the ladder or give them a ranked role, then scan again.",
      invalidSample: (mentions: string) => `Including: ${mentions}`,
      nothingFound: "Nobody has the staff role right now.",
      note: "The scan only updates levels; points, warnings and history are unchanged.",
      inProgress: `${E.warning} A scan is already running here. Wait for it to finish.`,
      staffRoleUnset: `${E.error} The general staff role isn't set (dashboard → Ranks & roles).`,
      failed: `${E.error} Couldn't finish the scan. Try again.`,
    },

    roleCheck: {
      title: "Role info",
      role: (roleId: string) => `Role: <@&${roleId}>`,
      level: (level: number) => `Level: **${level}**`,
      noLevel: "Level: none",
      tier: (label: string) => `Tier: **${label}**`,
      status: (text: string) => `Status: ${text}`,
      ignored: "Ignored",
      ignoredNote: "This role is left out of staff levels.",
      outside: "Not a staff level",
      outsideNote: "This role isn't on the staff ladder.",
      isStart: "Start of the staff ladder",
      isEnd: "End of the staff ladder (top level)",
    },

    boundary: {
      configured: (label: string) => `Start of ${label} set.`,
      notOnLadder: `${E.error} The role must be on the staff ladder. Set the start and end roles first.`,
      outOfOrder: `${E.error} Order must be: high staff, then owner, then ship, before the ladder's end.`,
      note: "It stays a regular staff role; it's now the first role of this tier.",
    },

    problems: {
      heading: `${E.error} The staff ladder is incomplete or wrong:`,
      START_NOT_CONFIGURED: "No start role (dashboard → Ranks & roles).",
      END_NOT_CONFIGURED: "No end role (dashboard → Ranks & roles).",
      STAFF_ROLE_NOT_CONFIGURED: "No general staff role (dashboard → Ranks & roles).",
      BOUNDARY_NOT_ON_LADDER: (label: string) => `The ${label} start role is no longer on the ladder. Set it again.`,
      BOUNDARY_OUT_OF_ORDER: (label: string) => `The ${label} start role is out of order; it must be above the tier before it.`,
    },
  },
  {
    scan: {
      started: `${E.loading} جاري فحص الطاقم…`,
      title: "تم فحص الطاقم.",
      found: (count: number) => `تم العثور على: **${count}**`,
      created: (count: number) => `تمت إضافة: **${count}**`,
      updated: (count: number) => `تم تحديث: **${count}**`,
      unchanged: (count: number) => `بدون تغيير: **${count}**`,
      errors: (count: number) => `أخطاء: **${count}**`,
      invalid: (count: number) => `ناقص: **${count}** عندهم رتبة الطاقم بدون رتبة مرقّمة.`,
      invalidHint: "راجع السلّم أو أعطهم رتبة مرقّمة ثم أعد الفحص.",
      invalidSample: (mentions: string) => `منهم: ${mentions}`,
      nothingFound: "ما أحد عنده رتبة الطاقم حالياً.",
      note: "الفحص يحدّث المستويات بس؛ النقاط والتحذيرات والسجل ما تتغير.",
      inProgress: `${E.warning} فيه فحص شغّال هنا. انتظر لين يخلص.`,
      staffRoleUnset: `${E.error} رتبة الطاقم العامة غير مضبوطة (الداشبورد ← الرتب).`,
      failed: `${E.error} ما قدرت أكمل الفحص. جرّب مرة ثانية.`,
    },

    roleCheck: {
      title: "معلومات الرتبة",
      role: (roleId: string) => `الرتبة: <@&${roleId}>`,
      level: (level: number) => `المستوى: **${level}**`,
      noLevel: "المستوى: لا يوجد",
      tier: (label: string) => `التصنيف: **${label}**`,
      status: (text: string) => `الحالة: ${text}`,
      ignored: "مستثناة",
      ignoredNote: "الرتبة مستثناة من مستويات الطاقم.",
      outside: "ليست مستوى إداري",
      outsideNote: "الرتبة مو ضمن سلّم الطاقم.",
      isStart: "بداية سلّم الطاقم",
      isEnd: "نهاية سلّم الطاقم (أعلى مستوى)",
    },

    boundary: {
      configured: (label: string) => `تم ضبط بداية ${label}.`,
      notOnLadder: `${E.error} لازم تكون الرتبة ضمن سلّم الطاقم. حدّد رتبة البداية والنهاية أول.`,
      outOfOrder: `${E.error} الترتيب: الإدارة العليا ثم الأونر ثم الشيب، قبل نهاية السلّم.`,
      note: "تظل رتبة إدارية عادية، بس صارت أول رتبة في هذا التصنيف.",
    },

    problems: {
      heading: `${E.error} سلّم الطاقم ناقص أو غلط:`,
      START_NOT_CONFIGURED: "رتبة البداية غير مضبوطة (الداشبورد ← الرتب).",
      END_NOT_CONFIGURED: "رتبة النهاية غير مضبوطة (الداشبورد ← الرتب).",
      STAFF_ROLE_NOT_CONFIGURED: "رتبة الطاقم العامة غير مضبوطة (الداشبورد ← الرتب).",
      BOUNDARY_NOT_ON_LADDER: (label: string) => `رتبة بداية ${label} ما عادت ضمن السلّم. اضبطها من جديد.`,
      BOUNDARY_OUT_OF_ORDER: (label: string) => `رتبة بداية ${label} ترتيبها غلط، لازم تكون فوق التصنيف اللي قبلها.`,
    },
  },
);
