import { branding } from "../config/branding.ts";
import { emojis } from "../emojis/index.ts";

const ATTACHMENT_PLACEHOLDER = "*(أرسل مرفق)*";
const NOT_PROVIDED = "*غير مذكور*";

export const modmailMessages = {
  menu: {
    title: `**${branding.moderationTitle}**`,
    prompt: "كيف أقدر أساعدك؟",
    reportButton: "بلّغ عن شخص",
  },

  wizard: {
    formExpired: "نموذج البلاغ انتهت صلاحيته. راسلني بالخاص مرة ثانية عشان تبدأ من جديد.",
    notReady: "بلاغك لسا مو جاهز. راسلني بالخاص مرة ثانية عشان تبدأ من جديد.",
    useButton: "استخدم الزر فوق عشان تكمل بلاغك، أو اكتب `الغاء`.",
    sendAttachments: "أرسل الصور / الملفات كمرفقات، أو اضغط **إرسال البلاغ**.",
    cancelled: "تم إلغاء البلاغ.",

    targetConfirmUser: (targetMention: string) =>
      `أنت تبلّغ عن ${targetMention}.\n\nكمّل عشان تضيف السبب والتفاصيل.`,
    targetConfirmStaff: (targetMention: string) =>
      `${emojis.warning} أنت تبلّغ عن **عضو ستاف**: ${targetMention}.\n\n` +
      "راح يتعامل معه كـ **بلاغ على ستاف**. كمّل عشان تضيف السبب والتفاصيل.",

    continueButton: "أضف السبب والتفاصيل",
    cancelButton: "إلغاء",
    submitButton: "إرسال البلاغ",

    evidenceTitle: "**الأدلة**",
    evidencePrompt: [
      "**الأدلة**",
      "",
      "أرسل أي صور أو فيديوهات أو ملفات كرسائل خاصة عادية الحين. تقدر ترسل كذا وحدة.",
      "",
    ],
    evidenceCollected: (count: number) => `اللي تم جمعه لحد الحين: **${count}**`,
    evidenceFinish: "اضغط **إرسال البلاغ** لمّا تخلص.",
    evidenceAck: (count: number) =>
      `${emojis.attachment} تمت الإضافة. الأدلة المجموعة: **${count}**. اضغط **إرسال البلاغ** لمّا تكون جاهز.`,

    submitted: (caseId: string) =>
      [
        `${emojis.success} تم إرسال بلاغك برقم \`${caseId}\`.`,
        "",
        "راح يراجعه مسؤول البلاغات. أي رد ترسله هنا الحين يروح لفريق البلاغات.",
      ].join("\n"),
    submittedShort: (caseId: string) => `${emojis.success} تم الإرسال برقم \`${caseId}\`.`,

    targetModalTitle: "بلّغ عن شخص",
    targetModalLabel: "آيدي حساب ديسكورد للشخص اللي تبي تبلّغ عنه",
    targetModalPlaceholder: "مثال: 123456789012345678",
    detailsModalTitle: "تفاصيل البلاغ",
    reasonLabel: "السبب (باختصار)",
    reasonPlaceholder: "مثال: تنمّر",
    descriptionLabel: "التفاصيل — وش اللي صار؟",
  },

  validation: {
    invalidUserId: `${emojis.error} هذا ما يشبه آيدي حساب ديسكورد صحيح.`,
    cannotReportSelf: `${emojis.error} ما تقدر تبلّغ عن نفسك.`,
    cannotReportBot: `${emojis.error} ما تقدر تبلّغ عن البوت.`,
    targetNotInGuild: `${emojis.error} هذا الشخص مو عضو حالياً في ${branding.communityName}.`,
    targetLookupFailed: `${emojis.error} ما قدرت أتأكد من هذا الشخص الحين. جرب بعد شوي.`,
    reasonAndDescriptionRequired: `${emojis.error} السبب والتفاصيل لازم الاثنين.`,
  },

  card: {
    headingNew: `${emojis.report} بلاغ جديد`,
    headingStaff: `${emojis.report} بلاغ على ستاف`,
    rule: (width: number) => "━".repeat(width),
    reportedLabel: "المُبلَّغ عنه:",
    reportedStaffLabel: "عضو الستاف المُبلَّغ عنه:",
    typeUserReport: "النوع: بلاغ على عضو",
    caseLine: (caseId: string) => `رقم البلاغ: \`${caseId}\``,
    reporterLabel: "المُبلِّغ:",
    reporterPrivate: `${emojis.lock} مخفي`,
    reasonLabel: "السبب:",
    evidenceLabel: "الأدلة:",
    evidenceCount: (n: number) => `${n} ملف`,
    statusLabel: "الحالة:",
    statusClaimed: (handlerMention?: string) =>
      `مُستلَم${handlerMention ? ` · ${handlerMention}` : ""}`,
    reasonFallback: NOT_PROVIDED,
    claimButton: "استلام",
    claimedButton: "مُستلَم",
  },

  thread: {
    openerHeading: (caseId: string, isStaffReport: boolean) =>
      `**${isStaffReport ? "بلاغ على ستاف" : "بلاغ"} \`${caseId}\`**`,
    reportedLine: (reportedUserId: string) => `المُبلَّغ عنه: <@${reportedUserId}>`,
    reporterLine: "المُبلِّغ: 👤 المُبلِّغ",
    reasonHeading: "**السبب**",
    descriptionHeading: "**التفاصيل**",
    notProvided: NOT_PROVIDED,
    evidenceLine: (n: number) =>
      `**الأدلة:** ${n} ملف (منشور تحت)`,
    replyHint:
      "_اكتب هنا عشان ترسل للمُبلِّغ. ابدأ السطر بـ `//` عشان تخلي ملاحظة داخلية ما تنرسل له._",
    infoButton: "معلومات المُبلِّغ (أدمن)",

    statusButtons: {
      investigating: "قيد التحقيق",
      waitingUser: "بانتظار العضو",
      resolve: "إنهاء",
      close: "إغلاق",
    },

    systemNote: (text: string) => `${emojis.system} ${text}`,
    claimedNote: (handlerMention: string) => `تم الاستلام من ${handlerMention}.`,
    statusNote: (status: string, actorMention: string) =>
      `الحالة → **${status}** (بواسطة ${actorMention}).`,
    caseClosedNoDelivery: "هذا البلاغ مغلق — ما تم توصيل الرسالة.",
    deliveryFailed:
      `${emojis.warning} ما قدرت أوصّل الرسالة — خاص المُبلِّغ مقفول أو طلع من السيرفر.`,
    evidenceSubmittedNote: "الأدلة المرسلة مع البلاغ",

    reporterLabel: "👤 **المُبلِّغ**",
    reporterRelay: (content: string) => {
      const body = content.trim();
      return body
        ? `👤 **المُبلِّغ**\n${body}`
        : `👤 **المُبلِّغ**\n${ATTACHMENT_PLACEHOLDER}`;
    },
  },

  dm: {
    staffRelay: (caseId: string, content: string) => {
      const body = content.trim();
      return [`**مسؤول البلاغات** · \`${caseId}\``, body || ATTACHMENT_PLACEHOLDER].join("\n");
    },
    chooseCase: "عندك أكثر من بلاغ مفتوح. هذي الرسالة عن أي وحد؟",
    caseSwitched: (caseId: string) =>
      `تمام — رسائلك الحين تروح لـ \`${caseId}\`. أرسلها مرة ثانية.`,
    caseClosedNotice: (caseId: string) =>
      `\`${caseId}\` تم إغلاقه. لو تحتاج مساعدة أكثر، راسلني بالخاص مرة ثانية عشان تفتح بلاغ جديد.`,
    relayFailed: `${emojis.error} ما قدرت أوصّل هذا لفريق البلاغات. جرب بعد شوي.`,
    relayError: `${emojis.error} صار خطأ وأنا أوصّل رسالتك.`,
    notSetUp: "لسا ما تم إعدادي بالكامل. جرب بعدين.",
  },

  info: {
    title: `${emojis.locked} **معلومات المُبلِّغ**`,
    userLine: (mention: string, tag: string) => `العضو: ${mention} (${tag})`,
    idLine: (userId: string) => `الآيدي: \`${userId}\``,
    createdLine: (epochSeconds: number) => `تاريخ البلاغ: <t:${epochSeconds}:F>`,
    unknownTag: "غير معروف",
  },

  claim: {
    awarded: (caseId: string) => `${emojis.success} استلمت \`${caseId}\`. **+1 نقطة.**`,
    alreadyHandler: (caseId: string) =>
      `${emojis.success} أنت المسؤول عن \`${caseId}\`.`,
    alreadyClaimed: "هذا البلاغ تم استلامه من قبل.",
  },

  permissions: {
    claimAboutYou: "ما تقدر تستلم بلاغ عنك أنت.",
    claimNotManager: "استلام البلاغات لمسؤولين البلاغات بس.",
  },
  status: {
    changed: (caseId: string, status: string) =>
      `${emojis.success} \`${caseId}\` → **${status}**.`,
  },

  errors: {
    targetMissing: "الشخص المُبلَّغ عنه ناقص.",
    reasonOrDescriptionMissing: "البلاغ ناقص سبب أو تفاصيل.",
    cannotClaim: "ما تقدر تستلم هذا البلاغ.",
    guildUnavailable: "سيرفر المجتمع مو متاح.",
    reportsNotConfigured:
      "روم البلاغات مو مضبوط. اطلب من الأدمن يشغّل `/channels set type:REPORTS`.",
    reportsChannelInvalid: "روم البلاغات المضبوط ما يدعم الثريدات.",
    notAllowedToManage: "ما عندك صلاحية تدير هذا البلاغ.",
    reporterInfoAdminOnly: "معلومات المُبلِّغ للأدمن بس.",
    stateChangedRetry: "تغيّرت حالة البلاغ — جرب مرة ثانية.",
    caseAlreadyClaimed: "هذا البلاغ تم استلامه من قبل.",

    unknownReportType: "نوع بلاغ غير معروف",
    reasonRequired: "لازم تكتب سبب",
    descriptionRequired: "لازم تكتب تفاصيل",
    cannotReportSelf: "ما تقدر تبلّغ عن نفسك",

    submitFailed: "ما تم إرسال بلاغك.",
    claimFailed: "ما قدرت أستلم هذا البلاغ.",
    reporterInfoFailed: "ما قدرت أجيب معلومات المُبلِّغ.",
    statusUpdateFailed: "ما قدرت أحدّث حالة البلاغ.",
    caseGone: "هذا البلاغ ما عاد موجود.",
  },

  reactions: {
    relayed: emojis.inbound,
    internalNote: emojis.note,
  },

  threadReason: (caseId: string) => `ثريد تحقيق للبلاغ ${caseId}`,
} as const;
