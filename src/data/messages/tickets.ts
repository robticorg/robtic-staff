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
    cantClaimOwn: `${E.error} ما تقدر تستلم تكتك انت.`,
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
    renameButton: "تغيير الاسم",
    transferButton: "تحويل",
    notAllowed: `${E.error} ما عندك صلاحية تدير هذا التكت — لازم تستلمه أول.`,
  },

  transfer: {
    modalTitle: "تحويل التكت",
    targetLabel: "العضو اللي تبي تحوّل له التكت",
    reasonLabel: "سبب التحويل",
    reasonPlaceholder: "اكتب سبب تحويل التكت…",

    notTransferable: `${E.error} قسم التكت هذا ما يسمح بتحويل التكتات.`,
    notClaimed: `${E.error} لازم يكون التكت مستلَم قبل ما ينحوّل.`,
    notAllowed: `${E.error} ما عندك صلاحية تحوّل هذا التكت — لازم تكون المستلِم.`,
    targetMissing: `${E.error} اختر عضو واحد عشان تحوّل له التكت.`,
    reasonMissing: `${E.error} سبب التحويل مطلوب.`,
    targetNotInGuild: `${E.error} هذا العضو مو موجود في السيرفر.`,
    targetIsBot: `${E.error} ما تقدر تحوّل التكت لبوت.`,
    targetIsClaimer: `${E.error} هذا العضو مستلِم التكت أصلاً.`,
    targetIsOwner: `${E.error} ما تقدر تحوّل التكت لصاحب التكت.`,
    targetNotStaff: `${E.error} لازم يكون العضو من الستاف أو أدمن.`,
    raced: `${E.error} تغيّر مستلِم التكت قبل شوي — افتح الخيارات مرة ثانية.`,

    done: (ticketId: string, userId: string) =>
      `${E.success} تم تحويل \`${ticketId}\` إلى <@${userId}>.`,
    dmFailed: (userId: string) =>
      `${E.warning} ما قدرت أرسل رسالة خاصة لـ <@${userId}> — خاصه مغلق.`,
    channelNote: (fromUserId: string, toUserId: string, reason: string) =>
      `${E.transfer} تم تحويل التكت من <@${fromUserId}> إلى <@${toUserId}>.\n**سبب التحويل:** ${reason}`,

    dm: {
      body: (ticketId: string, reason: string) =>
        `لقد تم تحويل التكت رقم \`${ticketId}\` اليك يرجى توجه للتكت حالا\nسبب تحويل : ${reason}`,
      button: "الذهاب للتكت",
    },
  },

  renameTicket: {
    modalTitle: "تغيير اسم التكت",
    nameLabel: "الاسم الجديد",
    namePlaceholder: "اكتب الاسم الجديد للتكت",
    done: (name: string) => `${E.success} تم تغيير اسم التكت إلى \`${name}\`.`,
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
    confirming: (ticketId: string, seconds: number) =>
      `${E.warning} بيتم إغلاق \`${ticketId}\` خلال ${seconds} ثواني...`,
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
    titleCreated: `${E.report} تم فتح تكت`,
    titleClaimed: `${E.staff} تم استلام تكت`,
    titleTransferred: `${E.transfer} تم تحويل تكت`,
    titleRenamed: "✏️ تم تغيير اسم تكت",
    titleClosed: "🔒 تم إغلاق تكت",
    titleDeleted: `${E.error} تم حذف تكت`,
    titleUserAdded: `${E.user} تمت إضافة عضو`,
    titleUserRemoved: `${E.user} تمت إزالة عضو`,
    titleRoleAdded: `${E.staff} تمت إضافة رتبة`,
    titleRoleRemoved: `${E.staff} تمت إزالة رتبة`,

    ticket: "التكت",
    panel: "القسم",
    actor: "بواسطة",
    newName: "الاسم الجديد",
    member: "العضو",
    role: "الرتبة",
    from: "من",
    to: "إلى",
    reason: "السبب",
  },

  faq: {
    added: (question: string) => `${E.success} تمت إضافة FAQ: **${question}**`,
    removed: (question: string) => `${E.success} تم حذف FAQ: **${question}**`,
    notFound: `${E.error} عنصر الـ FAQ هذا مو موجود.`,
    empty: "ما فيه ولا عنصر FAQ مضاف لحد الآن.",
    listTitle: "**FAQ**",
    listLine: (index: number, question: string, scope: string) => `${index}. ${question} — ${scope}`,
    scopeAll: "كل الأقسام",
    modalTitle: "إضافة FAQ",
    questionLabel: "السؤال",
    questionPlaceholder: "كيف أغيّر كلمة السر؟",
    answerLabel: "الإجابة",
    answerPlaceholder: "روح إلى الإعدادات ← الأمان ← تغيير كلمة السر…",
    selectPlaceholder: "تصفّح الأسئلة الشائعة",
    bothRequired: `${E.error} لازم سؤال وإجابة الاثنين.`,
    assigned: (question: string, scope: string) =>
      `${E.success} صار FAQ **${question}** يظهر في: ${scope}.`,
    unknownPanel: `${E.error} هذا القسم مو موجود.`,
  },
} as const;
