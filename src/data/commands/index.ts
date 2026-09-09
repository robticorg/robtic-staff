import { branding } from "../config/branding.ts";

export const CommandName = {
  ROLE: "role",
  CHANNELS: "channels",
  TICKET_SETUP: "ticket-setup",
  FAQ: "faq",
  FAST_ACCESS: "fast-access",
  VACATION_SETUP: "vacation-setup",
} as const;
export type CommandName = (typeof CommandName)[keyof typeof CommandName];

export const RoleSubcommand = {
  START: "start",
  END: "end",
  STAFF: "staff",
  IGNORE: "ignore",
  BLACKLIST: "blacklist",
  STAFF_MANAGER: "staffmanager",
  WARN: "warn",
  MUTE: "mute",
  JAIL: "jail",
  CHAT_MANAGER: "chatmanager",
  VACATION: "vacation",
  APPEAL_MANAGER: "appealmanager",
  GIFT_MANAGER: "giftmanager",
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
      add: { description: "إضافة عنصر FAQ (يفتح نموذج)" },
      remove: {
        description: "حذف عنصر FAQ",
        option: "الـ FAQ اللي تبي تحذفه",
      },
      list: { description: "عرض عناصر الـ FAQ المضافة" },
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
