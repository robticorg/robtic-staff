import { branding } from "../config/branding.ts";

export const CommandName = {
  ROLE: "role",
  CHANNELS: "channels",
  TICKET_SETUP: "ticket-setup",
  FAQ: "faq",
  FAST_ACCESS: "fast-access",
  STAFF_SETUP: "staff-setup",
  SCAN: "scan",
  POINTS: "points",
  SLEEP: "sleep",
  TICKET_STATS: "ticket-stats",
  PROMOTE_POINTS: "promote-points",
  WARN_SETUP: "warn-setup",
} as const;
export type CommandName = (typeof CommandName)[keyof typeof CommandName];

export const PointsSubcommand = {
  ADD: "add",
  REMOVE: "remove",
  RESET: "reset",
} as const;
export type PointsSubcommand = (typeof PointsSubcommand)[keyof typeof PointsSubcommand];

export const TicketStatsSubcommand = {
  RESET: "reset",
} as const;
export type TicketStatsSubcommand =
  (typeof TicketStatsSubcommand)[keyof typeof TicketStatsSubcommand];

/**
 * Six subcommands, not twenty-five. Every single-role slot goes through `set`,
 * every level-ranged slot through `range`; the two lists that grow on their own
 * (tiers, staff types) keep their own subcommand so neither can eat the other's
 * choice budget.
 */
export const RoleSubcommand = {
  SET: "set",
  RANGE: "range",
  BOUNDARY: "boundary",
  STAFF_TYPE: "stafftype",
  CHECK: "check",
  LIST: "list",
} as const;
export type RoleSubcommand = (typeof RoleSubcommand)[keyof typeof RoleSubcommand];

export const ChannelsSubcommand = {
  SET: "set",
  LIST: "list",
} as const;
export type ChannelsSubcommand = (typeof ChannelsSubcommand)[keyof typeof ChannelsSubcommand];

export const FaqSubcommand = {
  ADD: "add",
  REMOVE: "remove",
  LIST: "list",
  ASSIGN: "assign",
} as const;
export type FaqSubcommand = (typeof FaqSubcommand)[keyof typeof FaqSubcommand];

export const FastAccessSubcommand = {
  ADD: "add",
  REMOVE: "remove",
  LIST: "list",
} as const;
export type FastAccessSubcommand =
  (typeof FastAccessSubcommand)[keyof typeof FastAccessSubcommand];

export const CommandOption = {
  ROLE: "role",
  CHANNEL: "channel",
  TYPE: "type",
  WARN_1: "warn1",
  WARN_2: "warn2",
  WARN_3: "warn3",
  FAQ: "faq",
  CMD: "cmd",
  MESSAGE: "message",
  CONTEXT: "context",
  FROM: "from",
  TO: "to",
  MEMBER: "member",
  AMOUNT: "amount",
  REASON: "reason",
  PANEL: "panel",
  TIME: "time",
  TIER: "tier",
  POINTS: "points",
} as const;

export const commandCopy = {
  role: {
    description: `ضبط رتب ديسكورد اللي يستخدمها نظام ستاف ${branding.botName}`,
    sub: {
      set: {
        description: "ضبط رتبة لخانة وحدة في نظام الستاف",
        options: {
          type: "الخانة اللي تبي تضبطها",
          role: "الرتبة المطلوبة",
        },
      },
      range: {
        description: "ضبط رتبة تنعطى تلقائياً لمستويات ستاف معيّنة (أو نطاق رتب وصول)",
        options: {
          type: "نوع الربط",
          role: "الرتبة المطلوبة",
          from: "أول رتبة ستاف مرقّمة في النطاق (اختياري)",
          to: "آخر رتبة ستاف مرقّمة في النطاق (اختياري)",
        },
      },
      boundary: {
        description: "تحديد أول رتبة في تصنيف (هاي ستاف / أونر / شيب)",
        options: {
          tier: "التصنيف",
          role: "أول رتبة في هذا التصنيف",
        },
      },
      stafftype: {
        description: "ضبط رتبة نوع الستاف (ماكس / مبرمج …)",
        options: {
          type: "نوع الستاف",
          role: "الرتبة اللي تنعطى لهذا النوع",
        },
      },
      check: {
        description: "عرض مستوى الرتبة وتصنيفها في سلّم الستاف",
        option: "الرتبة اللي تبي تفحصها",
      },
      list: {
        description: "عرض كل الرتب المضبوطة في نظام الستاف",
      },
    },
  },
  promotePoints: {
    description: "ضبط الحد الأدنى من النقاط الأسبوعية اللي تأهّل الستاف للترقية",
    options: {
      points: "الحد الأدنى من النقاط في الأسبوع (رقم صحيح موجب)",
    },
  },
  scan: {
    description: "فحص السيرفر واستيراد أعضاء الستاف الموجودين ومزامنة مستوياتهم",
  },
  ticketStats: {
    description: "إدارة عدّادات تكتات الستاف",
    sub: {
      reset: {
        description: "تصفير عدّادات التكتات — للإداريين بس",
        options: {
          member: "عضو الستاف (اتركه فاضي عشان تصفّر الكل)",
        },
      },
    },
  },
  sleep: {
    description: "تنبيه صاحب التكت إنه بينقفل تلقائياً إذا ما رد",
    options: {
      time: "المدة قبل الإقفال — مثل 6h أو 30m (الافتراضي 6 ساعات)",
    },
  },
  points: {
    description: "إدارة نقاط الستاف يدويًا (إضافة / خصم / تصفير) — للإداريين بس",
    sub: {
      add: {
        description: "إضافة نقاط لعضو ستاف",
        options: {
          member: "عضو الستاف",
          amount: "عدد النقاط المراد إضافتها",
          reason: "سبب الإضافة (اختياري)",
        },
      },
      remove: {
        description: "خصم نقاط من عضو ستاف",
        options: {
          member: "عضو الستاف",
          amount: "عدد النقاط المراد خصمها",
          reason: "سبب الخصم (اختياري)",
        },
      },
      reset: {
        description: "تصفير نقاط عضو ستاف واحد، أو كل الستاف إذا ما حددت أحد",
        options: {
          member: "عضو الستاف (اتركه فاضي عشان تصفّر نقاط كل الستاف)",
        },
      },
    },
  },
  channels: {
    description: `ضبط الرومات اللي يستخدمها نظام ستاف ${branding.botName}`,
    sub: {
      set: {
        description: "تعيين روم لخانة في نظام الستاف",
        options: {
          type: "أي خانة روم في نظام الستاف تبي تضبط",
          channel: "الروم المطلوب",
        },
      },
      list: {
        description: "عرض إعدادات الرومات الحالية",
      },
    },
  },
  ticketSetup: {
    description: "نشر أو تحديث لوحة التكتات من إعدادات الكود",
  },
  staffSetup: {
    description: "نشر أو تحديث لوحة دعم الستاف في هذا الروم",
  },
  warnSetup: {
    description: "نشر أو تحديث لوحة إدارة العقوبات والتحذيرات في الروم المضبوط",
  },
  faq: {
    description: "إدارة الأسئلة الشائعة (FAQ) اللي تستخدمها التكتات",
    sub: {
      add: {
        description: "إضافة عنصر FAQ (يفتح نموذج)",
        option: "القسم اللي يظهر فيه (اتركه فاضي عشان يظهر بكل الأقسام)",
      },
      remove: {
        description: "حذف عنصر FAQ",
        option: "الـ FAQ اللي تبي تحذفه",
      },
      list: { description: "عرض عناصر الـ FAQ المضافة" },
      assign: {
        description: "تخصيص عنصر FAQ بقسم تكت معيّن (أو رجّعه لكل الأقسام)",
        options: {
          faq: "الـ FAQ اللي تبي تخصّصه",
          panel: "القسم اللي تبي تربطه فيه (اتركه فاضي عشان يرجع لكل الأقسام)",
        },
      },
    },
  },
  fastAccess: {
    description: "إدارة ماكروهات رسائل الستاف السريعة Fast Access ($commands)",
    sub: {
      add: {
        description: "إنشاء ماكرو Fast Access",
        options: {
          cmd: "اسم الماكرو (يُستخدم كـ $name)، مثال: rules",
          message: "الرسالة اللي يرسلها الماكرو",
          context: "وين ينفع تستخدم الماكرو",
        },
      },
      remove: {
        description: "حذف ماكرو Fast Access",
        option: "اسم الماكرو (بدون $)",
      },
      list: { description: "عرض ماكروهات Fast Access حق هذا السيرفر" },
    },
  },
} as const;
