import { bilingual } from "../../shared/utils/lang-context.ts";
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
  START_COUNT: "start-count",
  PROFILE: "profile",
} as const;
export type CommandName = (typeof CommandName)[keyof typeof CommandName];

export const PointsSubcommand = {
  ADD: "add",
  REMOVE: "remove",
  RESET: "reset",
  VALUES: "values",
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

const bot = branding.botName;

export const commandCopy = bilingual(
  {
    role: {
      description: `Set the Discord roles ${bot}'s staff system uses`,
      sub: {
        set: { description: "Set the role for one staff-system slot", options: { type: "The slot to set", role: "The role" } },
        range: {
          description: "Set a role given automatically to certain staff levels (or an access range)",
          options: { type: "Link type", role: "The role", from: "First ranked role in the range (optional)", to: "Last ranked role in the range (optional)" },
        },
        boundary: { description: "Set the first role of a tier (high staff / owner / ship)", options: { tier: "The tier", role: "The tier's first role" } },
        stafftype: { description: "Set a staff type's role (max, developer…)", options: { type: "The staff type", role: "The role for this type" } },
        check: { description: "Show a role's level and tier on the staff ladder", option: "The role to check" },
        list: { description: "Show every role set in the staff system" },
      },
    },
    autoclaim: {
      description: "Turn automatic credits for gifts on or off",
      options: { state: "State" },
      choices: { on: "On", off: "Off", status: "Show status" },
    },
    promotePoints: {
      description: "Set the weekly points staff need to be eligible for promotion",
      options: { points: "Minimum points per week (whole number)" },
    },
    scan: { description: "Scan the server, import existing staff and sync their levels" },
    ticketStats: {
      description: "Manage staff ticket counters",
      sub: { reset: { description: "Reset ticket counters (admins only)", options: { member: "Staff member (empty resets everyone)" } } },
    },
    sleep: {
      description: "Warn the ticket owner it closes automatically if they don't reply",
      options: { time: "Time before closing, like 6h or 30m (default 6 hours)" },
    },
    points: {
      description: "Manage staff points by hand (add / remove / reset), admins only",
      sub: {
        add: { description: "Add points to a staff member", options: { member: "Staff member", amount: "Points to add", reason: "Reason (optional)" } },
        remove: { description: "Remove points from a staff member", options: { member: "Staff member", amount: "Points to remove", reason: "Reason (optional)" } },
        reset: { description: "Reset one staff member's points, or everyone's if nobody is chosen", options: { member: "Staff member (empty resets everyone)" } },
        values: { description: "Set how many points each action gives (ticket claim, warning, jail…)" },
      },
    },
    profile: {
      description: "The bot's profile in this server",
      subcommands: { config: "Edit the bot's avatar, banner, name and bio in this server" },
    },
    startCount: {
      description: "Set the ladder's first level number: 0 (default) or 1",
      options: { start: "The number counting starts from" },
    },
    channels: {
      description: `Set the channels ${bot}'s staff system uses`,
      sub: {
        set: { description: "Set the channel for a staff-system slot", options: { type: "Which channel slot to set", channel: "The channel" } },
        list: { description: "Show the current channel setup" },
      },
    },
    warnSetup: { description: "Post or update the punishments and warnings panel in its channel" },
    faq: {
      description: "Manage the FAQs tickets use",
      sub: {
        add: { description: "Add an FAQ (opens a form)", option: "Section it shows in (empty for all)" },
        remove: { description: "Delete an FAQ", option: "The FAQ to delete" },
        list: { description: "Show the FAQs" },
        assign: {
          description: "Tie an FAQ to one ticket section (or back to all)",
          options: { faq: "The FAQ", panel: "The section (empty for all)" },
        },
      },
    },
    fastAccess: {
      description: "Manage Fast Access staff message macros ($commands)",
      sub: {
        add: {
          description: "Create a Fast Access macro",
          options: {
            cmd: "Macro name (used as $name), e.g. rules",
            message: "What it sends; put [args] where the text typed after it goes",
            context: "Where it can be used",
          },
        },
        remove: { description: "Delete a Fast Access macro", option: "Macro name (without $)" },
        list: { description: "Show this server's Fast Access macros" },
      },
    },
  },
  {
    role: {
      description: `ضبط رتب ديسكورد اللي يستخدمها نظام طاقم ${bot}`,
      sub: {
        set: { description: "ضبط رتبة لخانة في نظام الطاقم", options: { type: "الخانة", role: "الرتبة" } },
        range: {
          description: "ضبط رتبة تنعطى تلقائياً لمستويات معيّنة (أو نطاق رتب وصول)",
          options: { type: "نوع الربط", role: "الرتبة", from: "أول رتبة مرقّمة في النطاق (اختياري)", to: "آخر رتبة مرقّمة في النطاق (اختياري)" },
        },
        boundary: { description: "تحديد أول رتبة في تصنيف (إدارة عليا / أونر / شيب)", options: { tier: "التصنيف", role: "أول رتبة في التصنيف" } },
        stafftype: { description: "ضبط رتبة نوع إداري (ماكس / مبرمج …)", options: { type: "النوع", role: "رتبة هذا النوع" } },
        check: { description: "عرض مستوى الرتبة وتصنيفها في السلّم", option: "الرتبة" },
        list: { description: "عرض كل الرتب المضبوطة في نظام الطاقم" },
      },
    },
    autoclaim: {
      description: "تشغيل أو إيقاف التحويل التلقائي للكريدتس في الهدايا",
      options: { state: "الحالة" },
      choices: { on: "تشغيل", off: "إيقاف", status: "عرض الحالة" },
    },
    promotePoints: {
      description: "ضبط النقاط الأسبوعية المطلوبة للتأهل للترقية",
      options: { points: "أقل عدد نقاط بالأسبوع (رقم صحيح)" },
    },
    scan: { description: "فحص السيرفر واستيراد الإداريين ومزامنة مستوياتهم" },
    ticketStats: {
      description: "إدارة عدّادات تكتات الطاقم",
      sub: { reset: { description: "تصفير عدّادات التكتات (للإداريين)", options: { member: "الإداري (فاضي = الكل)" } } },
    },
    sleep: {
      description: "تنبيه صاحب التكت إنه يقفل تلقائياً إذا ما رد",
      options: { time: "المدة قبل الإقفال مثل 6h أو 30m (الافتراضي 6 ساعات)" },
    },
    points: {
      description: "إدارة نقاط الطاقم يدوياً (إضافة / خصم / تصفير)، للإداريين",
      sub: {
        add: { description: "إضافة نقاط لإداري", options: { member: "الإداري", amount: "عدد النقاط", reason: "السبب (اختياري)" } },
        remove: { description: "خصم نقاط من إداري", options: { member: "الإداري", amount: "عدد النقاط", reason: "السبب (اختياري)" } },
        reset: { description: "تصفير نقاط إداري، أو الكل إذا ما حددت أحد", options: { member: "الإداري (فاضي = الكل)" } },
        values: { description: "تحديد نقاط كل عمل (استلام تكت، تحذير، سجن…)" },
      },
    },
    profile: {
      description: "بروفايل البوت في هذا السيرفر",
      subcommands: { config: "تعديل صورة وبنر واسم وبايو البوت في هذا السيرفر" },
    },
    startCount: {
      description: "تحديد رقم أول مستوى في السلّم: 0 (الافتراضي) أو 1",
      options: { start: "رقم بداية العد" },
    },
    channels: {
      description: `ضبط الرومات اللي يستخدمها نظام طاقم ${bot}`,
      sub: {
        set: { description: "تعيين روم لخانة في نظام الطاقم", options: { type: "خانة الروم", channel: "الروم" } },
        list: { description: "عرض إعدادات الرومات" },
      },
    },
    warnSetup: { description: "نشر أو تحديث لوحة العقوبات والتحذيرات في رومها" },
    faq: {
      description: "إدارة الأسئلة الشائعة للتكتات",
      sub: {
        add: { description: "إضافة FAQ (يفتح نموذج)", option: "القسم اللي يظهر فيه (فاضي = الكل)" },
        remove: { description: "حذف FAQ", option: "الـ FAQ" },
        list: { description: "عرض الـ FAQ" },
        assign: {
          description: "ربط FAQ بقسم تكت (أو رجّعه للكل)",
          options: { faq: "الـ FAQ", panel: "القسم (فاضي = الكل)" },
        },
      },
    },
    fastAccess: {
      description: "إدارة ماكروهات رسائل الطاقم السريعة Fast Access ($commands)",
      sub: {
        add: {
          description: "إنشاء ماكرو Fast Access",
          options: {
            cmd: "اسم الماكرو (يُستخدم كـ $name)، مثال: rules",
            message: "اللي يرسله؛ حط [args] مكان الكلام بعد الأمر",
            context: "وين ينفع يُستخدم",
          },
        },
        remove: { description: "حذف ماكرو Fast Access", option: "اسم الماكرو (بدون $)" },
        list: { description: "عرض ماكروهات Fast Access في السيرفر" },
      },
    },
  },
);
