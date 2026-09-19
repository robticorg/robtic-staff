import { emojis } from "../emojis/index.ts";

const E = emojis;

export const warnPanelMessages = {
  panel: {
    title: "## إدارة العقوبات والتحذيرات",
    body: [
      "اختر الإجراء من القائمة تحت، وبيفتح لك نموذج تعبّي فيه العضو والسبب والدليل.",
      "كل إجراء ينحفظ في السجل وينرسل للوق التحذيرات تلقائياً.",
    ],
    footer: "الصلاحيات تتفحص من جديد وقت الإرسال — مو وقت فتح اللوحة.",

    selectPlaceholder: "اختر الإجراء المطلوب",
    options: {
      timeout: { label: "تايم اوت عضو", description: "إعطاء العضو تايم اوت لمدة محددة" },
      jail: { label: "سجن عضو", description: "إعطاء العضو رتبة السجن" },
      userWarn: { label: "تحذير عضو", description: "تحذير عضو عادي (مو ستاف)" },
      staffWarn: { label: "تحذير ستاف", description: "تحذير عضو ستاف حسب الصلاحيات" },
    },
  },

  setup: {
    channelNotConfigured: `${E.error} روم لوحة إدارة العقوبات مو مضبوط. شغّل \`/channels set type:لوحة إدارة العقوبات channel:#room\` أول.`,
    channelUnavailable: `${E.error} ما قدرت أوصل لروم اللوحة — تأكد إنه موجود وإن عندي صلاحية أرسل فيه.`,
    deployed: (channelId: string) => `تم نشر لوحة إدارة العقوبات في <#${channelId}>.`,
    updated: (channelId: string) => `تم تحديث لوحة إدارة العقوبات في <#${channelId}>.`,
  },

  modal: {
    timeoutTitle: "تايم اوت عضو",
    jailTitle: "سجن عضو",
    userWarnTitle: "تحذير عضو",
    staffWarnTitle: "تحذير ستاف",

    user: { label: "المستخدم", placeholder: "اختر العضو" },
    reason: { label: "السبب", placeholder: "اكتب سبب الإجراء" },
    evidence: {
      label: "الدليل",
      description: (max: number) => `ارفع صورة أو أكثر كدليل (حد أقصى ${max}).`,
    },
    duration: {
      label: "المدة",
      placeholder: "مثال: 5m · 30m · 1h · 6h · 1d · 7d",
    },
    verbal: {
      label: "تحذير شفوي",
      description: "علّمها عشان يكون التحذير شفوي — 3 شفوية تتحول لتحذير رسمي تلقائياً.",
    },
  },

  errors: {
    notStaff: `${E.error} هذي اللوحة للستاف بس.`,
    unknownAction: `${E.error} إجراء غير معروف.`,
    userRequired: `${E.error} لازم تختار عضو.`,
    reasonRequired: `${E.error} لازم تكتب سبب.`,
    evidenceRequired: `${E.error} لازم ترفع دليل واحد على الأقل.`,
    targetIsSelf: `${E.error} ما تقدر تطبّق الإجراء على نفسك.`,
    targetIsBot: `${E.error} ما تقدر تطبّق الإجراء على بوت.`,
    targetLeft: `${E.error} هذا العضو ما عاد في السيرفر.`,

    durationRequired: `${E.error} لازم تحدد المدة.`,
    durationInvalid: `${E.error} صيغة المدة غير صحيحة. استخدم مثل \`30m\` أو \`6h\` أو \`3d\`.`,
    durationTooShort: (min: string) => `${E.error} أقل مدة للتايم اوت هي ${min}.`,
    durationTooLong: (max: string) =>
      `${E.error} ديسكورد ما يسمح بتايم اوت أطول من ${max}. اختر مدة أقصر.`,

    timeoutFailed: (reason: string) =>
      `${E.error} ما تم تنفيذ التايم اوت — ${reason}\nما انحفظت العقوبة كمنفّذة.`,
    jailFailed: (reason: string) =>
      `${E.error} ما تم تنفيذ السجن — ${reason}\nما انحفظت العقوبة كمنفّذة.`,

    inFlight: `${E.warning} فيه إجراء شغّال على نفس العضو الحين. انتظر ثواني وجرب مرة ثانية.`,
    crashed: `${E.error} صار خطأ وأنا أنفذ الإجراء. ما تم تنفيذ شي.`,
  },

  success: {
    timeout: (mention: string, duration: string) =>
      `${E.success} تم إعطاء ${mention} تايم اوت لمدة **${duration}**.`,
    jail: (mention: string) => `${E.success} تم سجن ${mention}.`,
    userWarn: (mention: string) => `${E.success} تم تحذير ${mention}.`,
    staffWarnVerbal: (mention: string) => `${E.success} تم تسجيل تحذير شفوي على ${mention}.`,
    staffWarnReal: (mention: string, level: number) =>
      `${E.success} تم تسجيل **تحذير رسمي ${level}** على ${mention}.`,
    convertedToReal: (count: number) =>
      `${E.warning} تحوّلت ${count} تحذيرات شفوية إلى تحذير رسمي.`,
    fired: (mention: string) => `${E.warning} تم فصل ${mention} — وصل الحد الأقصى للتحذيرات.`,
  },
} as const;
