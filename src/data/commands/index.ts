import { branding } from "../config/branding.ts";

export const CommandName = {
  ROLE: "role",
  CHANNELS: "channels",
  TICKET_SETUP: "ticket-setup",
  FAQ: "faq",
  FAST_ACCESS: "fast-access",
  VACATION_SETUP: "vacation-setup",
  SCAN: "scan",
  POINTS: "points",
  SLEEP: "sleep",
} as const;
export type CommandName = (typeof CommandName)[keyof typeof CommandName];

export const PointsSubcommand = {
  ADD: "add",
  REMOVE: "remove",
  RESET: "reset",
} as const;
export type PointsSubcommand = (typeof PointsSubcommand)[keyof typeof PointsSubcommand];

export const RoleSubcommand = {
  START: "start",
  END: "end",
  STAFF: "staff",
  IGNORE: "ignore",
  BLACKLIST: "blacklist",
  STAFF_MANAGER: "staffmanager",
  OWNER_MANAGER: "ownermanager",
  TRANSFER_MANAGER: "transfermanager",
  WARN: "warn",
  MUTE: "mute",
  JAIL: "jail",
  CHAT_MANAGER: "chatmanager",
  VACATION: "vacation",
  APPEAL_MANAGER: "appealmanager",
  GIFT_MANAGER: "giftmanager",
  APPLY_MANAGER: "applymanager",
  TAG: "tag",
  CHECK: "check",
  ACCESS: "access",
  ACCEPTED: "accepted",
  ASSIGN: "assign",
  HIGHSTAFF: "highstaff",
  OWNER: "owner",
  SHIP: "ship",
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
} as const;

export const commandCopy = {
  role: {
    description: `ضبط رتب ديسكورد اللي يستخدمها نظام ستاف ${branding.botName}`,
    sub: {
      start: {
        description: "ضبط أول رتبة ستاف مرقّمة (دايماً المستوى 0)",
        option: "رتبة بداية الستاف",
      },
      end: {
        description: "ضبط آخر رتبة ستاف مرقّمة؛ المستويات تنحسب من الترتيب",
        option: "أعلى رتبة ستاف",
      },
      staff: {
        description: "ضبط رتبة @Staff العامة (مو ضمن الترتيب المرقّم)",
        option: "رتبة الستاف العامة",
      },
      ignore: {
        description: "تحديد رتبة عشان عدّاد مستوى الستاف يتجاهلها",
        option: "الرتبة اللي تنتجاهل",
      },
      blacklist: {
        description: "ضبط الرتبة اللي تنعطى لأعضاء الستاف في البلاك ليست",
        option: "رتبة البلاك ليست",
      },
      staffmanager: {
        description: "ضبط الرتبة اللي تعطي صلاحيات مانجر الستاف",
        option: "رتبة مانجر الستاف",
      },
      ownermanager: {
        description: "ضبط رتبة مانجر الأونر (صلاحية أعلى من مانجر الستاف، وما توصل الشيب)",
        option: "رتبة مانجر الأونر",
      },
      warn: {
        description: "ضبط رتب تحذيرات الستاف الثلاث (للستاف بس، مو تحذيرات الأعضاء)",
        options: {
          warn1: "رتبة تحذير الستاف 1",
          warn2: "رتبة تحذير الستاف 2",
          warn3: "رتبة تحذير الستاف 3",
        },
      },
      mute: {
        description: "ضبط الرتبة اللي تنطبّق مع عقوبة الميوت",
        option: "رتبة الميوت",
      },
      jail: {
        description: "ضبط الرتبة اللي تنطبّق مع عقوبة السجن",
        option: "رتبة السجن",
      },
      chatmanager: {
        description: "ضبط رتبة مانجر الشات (يوافق على طلبات عقوبة الكيك)",
        option: "رتبة مانجر الشات",
      },
      vacation: {
        description: "ضبط الرتبة اللي تنعطى لأعضاء الستاف وهم في إجازة / بريك",
        option: "رتبة الإجازة",
      },
      appealmanager: {
        description: "ضبط الرتبة اللي تقدر تراجع استئنافات العقوبات (زيادة على مانجرات الستاف)",
        option: "رتبة مانجر الاستئناف",
      },
      giftmanager: {
        description: "ضبط الرتبة اللي تقدر تراجع طلبات الهدايا وتسلّمها",
        option: "رتبة مانجر الهدايا",
      },
      transfermanager: {
        description: "ضبط الرتبة اللي تقدر تحوّل عضوية الستاف من عضو لعضو (!transfer)",
        option: "رتبة مانجر التحويل",
      },
      applymanager: {
        description: "ضبط الرتبة اللي تقدر تقبل طلبات التقديم (زيادة على مانجرات الستاف)",
        option: "رتبة مانجر التقديم",
      },
      tag: {
        description: "ضبط الرتبة اللي تنعطى تلقائياً لكل عضو يستخدم تاق السيرفر",
        option: "رتبة التاق",
      },
      check: {
        description: "عرض مستوى الرتبة وتصنيفها في سلّم الستاف",
        option: "الرتبة اللي تبي تفحصها",
      },
      access: {
        description: "إضافة رتب وصول للستاف (بدون مستوى) — رتبة وحدة أو نطاق كامل",
        options: {
          from: "أول رتبة في النطاق",
          to: "آخر رتبة في النطاق",
          role: "رتبة وحدة تنضاف لرتب الوصول",
        },
      },
      accepted: {
        description: "ضبط الرتبة اللي تنعطى تلقائياً لأي عضو ينقبل في الستاف",
        options: {
          role: "رتبة قبول الستاف",
          from: "أول رتبة ستاف مرقّمة تستحق الرتبة (اختياري)",
          to: "آخر رتبة ستاف مرقّمة تستحق الرتبة (اختياري)",
        },
      },
      staffType: {
        option: "الرتبة اللي تمثّل هذا النوع من الستاف",
      },
      assign: {
        description: "ربط رتبة إضافية بمستويات ستاف معيّنة — تنعطى وتنشال تلقائياً",
        options: {
          role: "الرتبة الإضافية",
          from: "أول رتبة ستاف مرقّمة تستحق الرتبة (اختياري)",
          to: "آخر رتبة ستاف مرقّمة تستحق الرتبة (اختياري)",
        },
      },
      highstaff: {
        description: "تحديد أول رتبة في تصنيف الهاي ستاف (لازم تكون ضمن السلّم المرقّم)",
        option: "أول رتبة هاي ستاف",
      },
      owner: {
        description: "تحديد أول رتبة في تصنيف الأونر (لازم تكون ضمن السلّم المرقّم)",
        option: "أول رتبة أونر",
      },
      ship: {
        description: "تحديد أول رتبة في تصنيف الشيب (لازم تكون ضمن السلّم المرقّم)",
        option: "أول رتبة شيب",
      },
    },
  },
  scan: {
    description: "فحص السيرفر واستيراد أعضاء الستاف الموجودين ومزامنة مستوياتهم",
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
  vacationSetup: {
    description: "نشر أو تحديث لوحة التقديم على إجازة الستاف في هذا الروم",
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
