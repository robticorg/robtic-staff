import { branding } from "../config/branding.ts";

export const CommandName = {
  ROLE: "role",
  CHANNELS: "channels",
  FAQ: "faq",
  FAST_ACCESS: "fast-access",
  SCAN: "scan",
  POINTS: "points",
  SLEEP: "sleep",
  TICKET_STATS: "ticket-stats",
  PROMOTE_POINTS: "promote-points",
  WARN_SETUP: "warn-setup",
  AUTOCLAIM: "autoclaim",
  INTAKE: "intake",
  INFO: "info",
  ADD_RES: "add-res",
  LEAD: "lead",
  WHITELIST: "whitelist",
  TICKET: "ticket",
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

export const IntakeSubcommand = {
  CLOSE: "close",
  OPEN: "open",
  LIST: "list",
} as const;
export type IntakeSubcommand = (typeof IntakeSubcommand)[keyof typeof IntakeSubcommand];

export const InfoSubcommand = {
  SETUP: "setup",
  ADD: "add",
  REMOVE: "remove",
  SEE: "see",
  ACCESS: "access",
  PAGE_GROUP: "page",
  PAGE_ADD: "add",
  PAGE_DELETE: "delete",
  PAGE_EDIT: "edit",
} as const;

export const TicketSubcommand = {
  SETUP: "setup",
  SEND: "send",
} as const;

export const WhitelistSubcommand = {
  ADD: "add",
  REMOVE: "remove",
  LIST: "list",
} as const;

export const LeadSubcommand = {
  CREATE: "create",
  ASSIGN: "assign",
  REMOVE: "remove",
  LIST: "list",
  INFO: "info",
} as const;

export const CommandOption = {
  TARGET: "target",
  INFO: "info",
  PAGE: "page",
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
  NAME: "name",
  DESCRIPTION: "description",
  LEAD: "lead",
  TARGET_USER: "target_user",
  TARGET_ROLE: "target_role",
  TARGET_RESPONSIBILITY: "target_responsibility",
  LEAD_USER: "lead_user",
  LEAD_ROLE: "lead_role",
  USER: "user",
  REPLACE: "replace",
} as const;

export const commandCopy = {
  role: {
    description: `ضبط رتب ديسكورد اللي يستخدمها نظام الطاقم الاداري ${branding.botName}`,
    sub: {
      set: {
        description: "ضبط رتبة لخانة وحدة في نظام الطاقم الاداري",
        options: {
          type: "الخانة اللي تبي تضبطها",
          role: "الرتبة المطلوبة",
        },
      },
      range: {
        description: "ضبط رتبة تنعطى تلقائياً لمستويات ادارية معيّنة (أو نطاق رتب وصول)",
        options: {
          type: "نوع الربط",
          role: "الرتبة المطلوبة",
          from: "أول رتبة ادارية مرقّمة في النطاق (اختياري)",
          to: "آخر رتبة ادارية مرقّمة في النطاق (اختياري)",
        },
      },
      boundary: {
        description: "تحديد أول رتبة في تصنيف (ادارة عليا / أونر / شيب)",
        options: {
          tier: "التصنيف",
          role: "أول رتبة في هذا التصنيف",
        },
      },
      stafftype: {
        description: "ضبط رتبة نوع الطاقم الاداري (ماكس / مبرمج …)",
        options: {
          type: "نوع الطاقم الاداري",
          role: "الرتبة اللي تنعطى لهذا النوع",
        },
      },
      check: {
        description: "عرض مستوى الرتبة وتصنيفها في سلّم الطاقم الاداري",
        option: "الرتبة اللي تبي تفحصها",
      },
      list: {
        description: "عرض كل الرتب المضبوطة في نظام الطاقم الاداري",
      },
    },
  },
  autoclaim: {
    description: "تشغيل أو إيقاف التحويل التلقائي للكريدتس في الهدايا",
    options: {
      state: "الحالة",
    },
    choices: {
      on: "تشغيل",
      off: "إيقاف",
      status: "عرض الحالة",
    },
  },
  promotePoints: {
    description: "ضبط الحد الأدنى من النقاط الأسبوعية اللي تأهّل الطاقم الاداري للترقية",
    options: {
      points: "الحد الأدنى من النقاط في الأسبوع (رقم صحيح موجب)",
    },
  },
  scan: {
    description: "فحص السيرفر واستيراد أعضاء الطاقم الاداري الموجودين ومزامنة مستوياتهم",
  },
  ticketStats: {
    description: "إدارة عدّادات تكتات الطاقم الاداري",
    sub: {
      reset: {
        description: "تصفير عدّادات التكتات — للإداريين بس",
        options: {
          member: "عضو الطاقم الاداري (اتركه فاضي عشان تصفّر الكل)",
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
    description: "إدارة نقاط الطاقم الاداري يدويًا (إضافة / خصم / تصفير) — للإداريين بس",
    sub: {
      add: {
        description: "إضافة نقاط لعضو في الطاقم الاداري",
        options: {
          member: "عضو الطاقم الاداري",
          amount: "عدد النقاط المراد إضافتها",
          reason: "سبب الإضافة (اختياري)",
        },
      },
      remove: {
        description: "خصم نقاط من عضو في الطاقم الاداري",
        options: {
          member: "عضو الطاقم الاداري",
          amount: "عدد النقاط المراد خصمها",
          reason: "سبب الخصم (اختياري)",
        },
      },
      reset: {
        description: "تصفير نقاط عضو في الطاقم الاداري واحد، أو كل الطاقم الاداري إذا ما حددت أحد",
        options: {
          member: "عضو الطاقم الاداري (اتركه فاضي عشان تصفّر نقاط كل الطاقم الاداري)",
        },
      },
    },
  },
  channels: {
    description: `ضبط الرومات اللي يستخدمها نظام الطاقم الاداري ${branding.botName}`,
    sub: {
      set: {
        description: "تعيين روم لخانة في نظام الطاقم الاداري",
        options: {
          type: "أي خانة روم في نظام الطاقم الاداري تبي تضبط",
          channel: "الروم المطلوب",
        },
      },
      list: {
        description: "عرض إعدادات الرومات الحالية",
      },
    },
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
    description: "إدارة ماكروهات رسائل الطاقم الاداري السريعة Fast Access ($commands)",
    sub: {
      add: {
        description: "إنشاء ماكرو Fast Access",
        options: {
          cmd: "اسم الماكرو (يُستخدم كـ $name)، مثال: rules",
          message: "الرسالة اللي يرسلها الماكرو — حط [args] مكان الكلام اللي يُكتب بعد الأمر",
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
