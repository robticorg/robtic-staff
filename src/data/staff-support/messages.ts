import { emojis } from "../emojis/index.ts";

const E = emojis;

export const staffSupportMessages = {
  panel: {
    title: "## دعم الستاف",
    body: [
      "هنا تقدر تتواصل مع الإدارة أو تقدّم على إجازة أو استقالة.",
      "اختر اللي تبيه من الأزرار تحت، وراح ينفتح لك نموذج تعبّيه.",
    ],
    footer: "Robtic • دعم الستاف",

    supportButton: "دعم الستاف",
    breakButton: "طلب إجازة",
    demissionButton: "طلب استقالة",

    setupDeployed: (channelId: string) => `${E.success} تم نشر لوحة دعم الستاف في <#${channelId}>.`,
    setupUpdated: (channelId: string) => `${E.success} تم تحديث لوحة دعم الستاف في <#${channelId}>.`,
    setupChannelInvalid: `${E.error} لازم تشغّل الأمر في روم نصي.`,
  },

  support: {
    modalTitle: "دعم الستاف",
    reasonLabel: "السبب",
    reasonPlaceholder: "اشرح موضوعك بالتفصيل…",

    notStaff: `${E.error} هذا الأمر لأعضاء الستاف بس.`,
    reasonRequired: `${E.error} لازم تكتب السبب.`,
    categoryMissing: `${E.error} فيه خطأ بإعدادات دعم الستاف (الكاتيقوري ناقص). تم إبلاغ الإدارة.`,
    alreadyOpen: (channelId: string) => `${E.warning} عندك طلب دعم مفتوح أصلاً: <#${channelId}>.`,
    created: (channelId: string) => `${E.success} تم فتح طلب الدعم حقك: <#${channelId}>.`,
    failed: `${E.error} ما قدرت أفتح طلب الدعم. جرب مرة ثانية.`,

    channelHeader: (ticketId: string) => `# دعم الستاف · \`${ticketId}\``,
    openedBy: (userId: string) => `مقدّم الطلب: <@${userId}>`,
    reasonLine: (reason: string) => `**السبب**\n${reason}`,
    visibilityStaff: "-# يشوف هذا الطلب: مانجر الستاف ومانجر الأونر.",
    visibilityOwner: "-# يشوف هذا الطلب: مانجر الأونر بس.",
    visibilityShip: "-# يشوف هذا الطلب: الإدارة بس.",
  },

  demission: {
    modalTitle: "طلب استقالة",
    reasonLabel: "السبب",
    reasonPlaceholder: "وش سبب الاستقالة؟",

    notStaff: `${E.error} هذا الأمر لأعضاء الستاف بس.`,
    reasonRequired: `${E.error} لازم تكتب سبب الاستقالة.`,
    alreadyOpen: `${E.warning} عندك طلب استقالة مقدّم أصلاً وبانتظار الإدارة.`,
    channelNotConfigured: `${E.error} روم طلبات الإجازات مو مضبوط. كلّم الإدارة.`,
    channelUnavailable: `${E.error} ما قدرت أوصل لروم الطلبات. كلّم الإدارة.`,
    submitted: `${E.success} تم إرسال طلب الاستقالة حقك للإدارة.`,
    failed: `${E.error} ما قدرت أرسل الطلب. جرب مرة ثانية.`,

    cardTitle: "## طلب استقالة",
    cardStaff: (userId: string) => `**العضو:** <@${userId}>`,
    cardLevel: (level: number) => `**المستوى:** ${level}`,
    cardTier: (tier: string) => `**التصنيف:** ${tier}`,
    cardReason: (reason: string) => `**السبب:**\n${reason}`,
    statusPending: "-# بانتظار قرار الإدارة",
    statusDone: (managerId: string) => `-# تم فصل العضو بواسطة <@${managerId}>`,

    fireButton: "فصل الموظف",

    notAuthorized: `${E.error} ما عندك صلاحية تتعامل مع طلب الاستقالة هذا.`,
    alreadyHandled: "تم التعامل مع طلب الاستقالة مسبقًا.",
    requestGone: `${E.error} طلب الاستقالة هذا ما عاد موجود.`,
    targetGone: `${E.error} العضو ما عاد موجود في السيرفر.`,
    targetNotStaff: `${E.error} هذا العضو ما عاد عضو ستاف.`,
    fired: (userId: string) => `${E.success} تم فصل <@${userId}> بناءً على طلب الاستقالة.`,
    fireFailed: `${E.error} ما قدرت أنفّذ الفصل. جرب مرة ثانية.`,
  },

  tier: {
    STAFF: "ستاف",
    HIGHSTAFF: "هاي ستاف",
    OWNER: "أونر",
    SHIP: "شيب",
  } as Record<string, string>,
} as const;
