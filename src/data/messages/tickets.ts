import { emojis } from "../emojis/index.ts";

const E = emojis;

export const ticketMessages = {
  setup: {
    deployed: (channelId: string, panelCount: number) =>
      `${E.success} تم نشر لوحة التكتات في <#${channelId}> بـ **${panelCount}** قسم.`,
    updated: (channelId: string, panelCount: number) =>
      `${E.success} تم تحديث لوحة التكتات في <#${channelId}> (**${panelCount}** قسم).`,
    noPanels: `${E.error} ما فيه ولا لوحة تكتات مضبوطة في \`src/data/tickets/\`.`,
    invalidConfig: (problems: string[]) =>
      [`${E.error} إعدادات التكتات فيها مشاكل:`, ...problems.map((p) => `• ${p}`)].join("\n"),
    problem: {
      mainChannelMissing: "الحقل main.panelChannelId مو مضبوط أو الروم مو موجود",
      mainChannelNotText: "الحقل main.panelChannelId مو روم نصي",
      managerRoleMissing: "الحقل main.managerRoleId مو مضبوط أو الرتبة مو موجودة",
      panelSupportRole: (id: string) => `اللوحة "${id}": supportRoleId مو مضبوط أو الرتبة مو موجودة`,
      panelCategory: (id: string) => `اللوحة "${id}": categoryId مو مضبوط أو مو كاتيقوري`,
      panelLogChannel: (id: string) => `اللوحة "${id}": logChannelId مو مضبوط أو الروم مو موجود`,
      panelDuplicateId: (id: string) => `آيدي لوحة مكرر "${id}"`,
      panelTooManyQuestions: (id: string, n: number, max: number) =>
        `اللوحة "${id}" فيها ${n} أسئلة؛ أكثر من ${max} تحتاج مودالات متعددة الصفحات (مدعومة، بس للعلم)`,
    },
  },

  panel: {
    selectPlaceholderFallback: "اختر قسم…",
  },

  create: {
    unknownPanel: `${E.error} قسم التكت هذا ما عاد موجود.`,
    alreadyOpen: (channelId: string) =>
      `${E.warning} عندك تكت مفتوح أصلاً: <#${channelId}>.`,
    created: (channelId: string) => `${E.success} تم فتح التكت حقك: <#${channelId}>.`,
    failed: `${E.error} ما قدرت أفتح التكت. جرب مرة ثانية أو كلّم أحد الستاف.`,
    categoryMissing: `${E.error} قسم التكت هذا فيه خطأ بالإعداد (كاتيقوري ديسكورد ناقص). تم إبلاغ الستاف.`,
    channelHeader: (ticketId: string, panelName: string) =>
      `# ${panelName} · \`${ticketId}\``,
    answersHeading: "### الإجابات المرسلة",
    answerLine: (question: string, answer: string) => `**${question}**\n${answer}`,
    openedBy: (userId: string) => `فتحه <@${userId}>`,
  },

  questions: {
    modalTitle: (panelName: string) => `${panelName} — التفاصيل`.slice(0, 45),
    continueTitle: "أسئلة إضافية",
    continueButton: "متابعة",
    pageIndicator: (page: number, total: number) => `الخطوة ${page} من ${total}`,
    expired: `${E.error} نموذج التكت انتهت صلاحيته. افتح تكت جديد وجرب مرة ثانية.`,
  },

  claim: {
    notEligible: `${E.error} ما عندك صلاحية تستلم تكتات هذا القسم.`,
    notOpen: `${E.error} هذا التكت ما عاد يمكن استلامه.`,
    alreadyClaimed: (userId: string) => `${E.error} هذا التكت مستلَم أصلاً من <@${userId}>.`,
    success: (ticketId: string) => `${E.success} استلمت \`${ticketId}\`. **+1 نقطة.**`,
    successNoPoint: (ticketId: string) => `${E.success} أنت الحين مسؤول عن \`${ticketId}\`.`,
    threadNote: (userMention: string) => `${E.staff} تم الاستلام من ${userMention}.`,
  },

  ticketButtons: {
    claim: "استلام",
    options: "خيارات",
  },

  options: {
    title: "**خيارات التكت**",
    closeButton: "إغلاق",
    addUserButton: "إضافة عضو",
    removeUserButton: "إزالة عضو",
    notAllowed: `${E.error} ما عندك صلاحية تدير هذا التكت.`,
  },

  addUser: {
    modalTitle: "إضافة للتكت",
    usersLabel: "الأعضاء اللي تبي تضيفهم",
    rolesLabel: "الرتب اللي تبي تضيفها",
    nothingSelected: `${E.error} اختر عضو أو رتبة واحدة على الأقل.`,
    done: (users: number, roles: number) =>
      `${E.success} تمت إضافة ${users} عضو و ${roles} رتبة للتكت.`,
  },

  removeUser: {
    modalTitle: "إزالة من التكت",
    selectLabel: "مين تبي تشيل",
    selectPlaceholder: "اختر الأعضاء/الرتب اللي انضافوا",
    nothingToRemove: `${E.error} ما فيه أعضاء أو رتب مضافة عشان تشيلها.`,
    nothingSelected: `${E.error} اختر عنصر واحد على الأقل عشان تشيله.`,
    protectedSkipped: `${E.warning} تم تجاوز صاحب التكت / المستلم / رتبة الدعم — ما ينشالون.`,
    done: (count: number) => `${E.success} تم حذف ${count} عنصر من التكت.`,
  },

  close: {
    done: (ticketId: string) => `${E.success} تم إغلاق \`${ticketId}\`.`,
    withTranscript: (ticketId: string) => `${E.success} تم إغلاق \`${ticketId}\` — تم حفظ النسخة.`,
    channelWillDelete: `${E.warning} راح ينحذف هذا التكت بعد شوي.`,
    notAllowed: `${E.error} ما عندك صلاحية تغلق هذا التكت.`,
  },

  common: {
    notATicket: `${E.error} هذا مو روم تكت.`,
    ticketGone: `${E.error} هذا التكت ما عاد موجود.`,
    wrongGuild: `${E.error} هذا التكت مو حق هذا السيرفر.`,
    genericError: `${E.error} صار خطأ، جرب مرة ثانية.`,
  },

  log: {
    created: (ticketId: string, userId: string, panelName: string) =>
      `${E.report} **تم فتح تكت** — \`${ticketId}\` (${panelName}) بواسطة <@${userId}>`,
    claimed: (ticketId: string, staffId: string) =>
      `${E.staff} **تم استلام تكت** — \`${ticketId}\` بواسطة <@${staffId}>`,
    renamed: (ticketId: string, name: string, staffId: string) =>
      `✏️ **تم تغيير اسم تكت** — \`${ticketId}\` → \`${name}\` بواسطة <@${staffId}>`,
    closed: (ticketId: string, staffId: string) =>
      `🔒 **تم إغلاق تكت** — \`${ticketId}\` بواسطة <@${staffId}>`,
    deleted: (ticketId: string, staffId: string) =>
      `${E.error} **تم حذف تكت** — \`${ticketId}\` بواسطة <@${staffId}>`,
    userAdded: (ticketId: string, targetId: string, staffId: string) =>
      `${E.user} **تمت إضافة عضو** — <@${targetId}> إلى \`${ticketId}\` بواسطة <@${staffId}>`,
    userRemoved: (ticketId: string, targetId: string, staffId: string) =>
      `${E.user} **تمت إزالة عضو** — <@${targetId}> من \`${ticketId}\` بواسطة <@${staffId}>`,
    roleAdded: (ticketId: string, roleId: string, staffId: string) =>
      `${E.staff} **تمت إضافة رتبة** — <@&${roleId}> إلى \`${ticketId}\` بواسطة <@${staffId}>`,
    roleRemoved: (ticketId: string, roleId: string, staffId: string) =>
      `${E.staff} **تمت إزالة رتبة** — <@&${roleId}> من \`${ticketId}\` بواسطة <@${staffId}>`,
  },

  faq: {
    added: (question: string) => `${E.success} تمت إضافة FAQ: **${question}**`,
    removed: (question: string) => `${E.success} تم حذف FAQ: **${question}**`,
    notFound: `${E.error} عنصر الـ FAQ هذا مو موجود.`,
    empty: "ما فيه ولا عنصر FAQ مضاف لحد الآن.",
    listTitle: "**FAQ**",
    listLine: (index: number, question: string) => `${index}. ${question}`,
    modalTitle: "إضافة FAQ",
    questionLabel: "السؤال",
    questionPlaceholder: "كيف أغيّر كلمة السر؟",
    answerLabel: "الإجابة",
    answerPlaceholder: "روح إلى الإعدادات ← الأمان ← تغيير كلمة السر…",
    selectPlaceholder: "تصفّح الأسئلة الشائعة",
    bothRequired: `${E.error} لازم سؤال وإجابة الاثنين.`,
  },
} as const;
