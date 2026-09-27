import { emojis } from "../emojis/index.ts";

const E = emojis;

export const GIFT_DELIVERY_TYPE_LABELS: Record<string, string> = {
  CREDITS: "كريدتس",
  LINK: "رابط",
  OTHER: "أخرى",
};

export const GIFT_DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار التسليم",
  PROCESSING: "جاري التسليم",
  READY: "بانتظار العضو يفتح الجائزة",
  CLAIMED: "استلمها العضو",
  FULFILLED: "تم التسليم",
  FAILED: "فشل التسليم",
};

export const giftDeliveryMessages = {
  typeMenu: {
    title: "## نوع الجائزة",
    claimHint: "اختر نوع الجائزة عشان نكمّل الموافقة والتسليم.",
    commandHint: (userId: string, info: string | null) =>
      info ? `الجائزة لـ <@${userId}>\n**المعلومات:** ${info}` : `الجائزة لـ <@${userId}>`,
  },

  modals: {
    amountTitle: "مبلغ الكريدتس",
    amountLabel: "المبلغ",
    amountPlaceholder: "مثال: 500000",
    linkTitle: "تسليم الجائزة",
    linkLabel: "رابط الهدية",
    linkPlaceholder: "https://discord.gift/…",
    infoLabel: "معلومات إضافية",
    infoPlaceholder: "اسم الحساب، طريقة الاستلام، أو أي تفاصيل يحتاجها العضو",
    proofTitle: "تسليم الجائزة",
    proofLabel: "إثبات التسليم",
    proofDescription: "ارفع صورة أو ملف يثبت إنك سلّمت الجائزة.",
  },

  buttons: {
    deliver: "تسليم الجائزة",
    retry: "إعادة محاولة التسليم",
    reveal: "عرض الجائزة",
  },

  errors: {
    amountInvalid: `${E.error} المبلغ لازم يكون رقم صحيح أكبر من صفر.`,
    linkInvalid: `${E.error} رابط الهدية غير صالح. لازم يبدأ بـ https://`,
    proofRequired: `${E.error} لازم ترفع إثبات التسليم.`,
    proofTooLarge: `${E.error} ملف الإثبات كبير. صغّره وجرب مرة ثانية.`,
    proofDownloadFailed: `${E.error} ما قدرت أحفظ ملف الإثبات. جرب مرة ثانية.`,
    deliveriesChannelMissing: `${E.error} روم تسليم الهدايا مو مضبوط. شغّل \`/channels set\` أول.`,
    deliveryCategoryMissing: `${E.error} كاتيقوري تسليم الهدايا مو مضبوط، والخاص حق العضو مقفل.`,
    creditsDisabled: `${E.error} التحويل التلقائي للكريدتس مو مفعّل على البوت.`,
    autoclaimOff: `${E.error} التحويل التلقائي للكريدتس مقفل حالياً. شغّله من \`/autoclaim\` أول، أو اختر نوع ثاني للجائزة.`,
    secretKeyMissing: `${E.error} تسليم الروابط مو مفعّل على البوت (مفتاح التشفير ناقص).`,
    typeRequired: `${E.error} لازم تختار نوع الجائزة.`,
    typeMismatch: `${E.error} نوع هذي الجائزة مختلف. استخدم زر التسليم الصحيح.`,
    alreadyDelivered: `${E.warning} تم تسليم هذي الجائزة من قبل.`,
    inProgress: `${E.warning} التسليم شغّال الحين، انتظر لين يخلص.`,
    notRetryable: `${E.error} ما فيه تسليم فاشل يحتاج إعادة.`,
    notApproved: `${E.error} لازم يتوافق على الطلب قبل التسليم.`,
    userGone: `${E.error} العضو ما عاد موجود.`,
    apiUnavailable: "خدمة التحويل ما ترد حالياً",
    apiRejected: "خدمة التحويل رفضت الطلب",
    apiTimeout: "خدمة التحويل ما ردّت في الوقت",
    notOwner: "هذه الجائزة ليست لك.",
    alreadyClaimed: "تم استخدام هذه الجائزة بالفعل.",
    notAvailable: "هذي الجائزة ما عادت متاحة.",
  },

  acks: {
    creditsDelivered: (amount: string) => `${E.success} تم تحويل **${amount}** كريدت بنجاح.`,
    creditsFailed: (reason: string) =>
      `${E.error} ما تم التحويل: ${reason}. الطلب باقي مقبول وتقدر تعيد المحاولة من زر **إعادة محاولة التسليم**.`,
    linkReadyDm: `${E.success} تم تجهيز الجائزة وإرسالها للعضو بالخاص.`,
    linkReadyChannel: (channelId: string) =>
      `${E.success} خاص العضو مقفل، فتم تجهيز الجائزة له في <#${channelId}>.`,
    otherDelivered: `${E.success} تم تسليم الجائزة وحفظ الإثبات.`,
    approvedPickDelivery: `${E.success} تمت الموافقة. اضغط **تسليم الجائزة** على البطاقة لما تجهز.`,
  },

  user: {
    linkReady: "تم تجهيز جائزتك 🎁\n\nاضغط على الزر بالأسفل لعرض الجائزة.",
    linkReadyChannel: (userId: string) =>
      `<@${userId}>\nتعذر إرسال الجائزة في الخاص لأن الرسائل الخاصة لديك مغلقة.\n\nتم تجهيز جائزتك، اضغط على الزر أدناه لعرضها.`,
    revealed: (link: string, info: string | null) =>
      info ? `🎁 **جائزتك:**\n${link}\n\n**معلومات إضافية:**\n${info}` : `🎁 **جائزتك:**\n${link}`,
    claimedState: `${E.success} تم استلام الجائزة.`,
    creditsDelivered: (amount: string) => `تم تحويل **${amount}** كريدت لحسابك 🎁`,
  },

  log: {
    creditsStarting: (userId: string, amount: string, claimId: string) =>
      `${E.loading} جاري تحويل **${amount}** كريدت إلى <@${userId}> — طلب \`${claimId}\``,
    creditsDone: (userId: string, amount: string, claimId: string) =>
      `${E.success} تم تحويل **${amount}** كريدت إلى <@${userId}> — طلب \`${claimId}\``,
    creditsFailed: (userId: string, claimId: string, reason: string) =>
      `${E.error} فشل تحويل الكريدت لـ <@${userId}> — طلب \`${claimId}\`\n**السبب:** ${reason}`,
    linkReady: (userId: string, staffId: string, claimId: string, where: string) =>
      `${E.success} تم تجهيز جائزة رابط لـ <@${userId}> بواسطة <@${staffId}> — طلب \`${claimId}\` (${where})`,
    linkClaimed: (userId: string, claimId: string) =>
      `${E.success} <@${userId}> استلم جائزة الرابط — طلب \`${claimId}\``,
    otherDelivered: (userId: string, staffId: string, claimId: string) =>
      `${E.success} تم تسليم جائزة لـ <@${userId}> بواسطة <@${staffId}> — طلب \`${claimId}\``,
    info: (info: string) => `**معلومات إضافية:** ${info}`,
    whereDm: "بالخاص",
    whereChannel: (channelId: string) => `في <#${channelId}>`,
  },

  autoclaim: {
    enabled: "تم تشغيل التحويل التلقائي للكريدتس.",
    disabled: "تم إيقاف التحويل التلقائي للكريدتس. ما راح يتم أي تحويل لين تشغّله.",
    statusOn: "التحويل التلقائي للكريدتس: **شغّال**",
    statusOff: "التحويل التلقائي للكريدتس: **مقفل**",
    urlMissingNote: "-# تنبيه: رابط خدمة التحويل (AUTOCLAIM_API_URL) مو مضبوط، فالتحويل راح يفشل لين يتضبط.",
  },

  card: {
    type: (label: string) => `**نوع الجائزة:** ${label}`,
    amount: (amount: string) => `**المبلغ:** ${amount}`,
    deliveryStatus: (label: string) => `**حالة التسليم:** ${label}`,
    deliveryError: (reason: string) => `**آخر خطأ:** ${reason}`,
  },

  command: {
    usage: `${E.warning} الطريقة: \`!gift @user <الجائزة>\``,
    notInTicket: `${E.error} هذا الأمر يشتغل داخل تكت بس.`,
    notStaff: `${E.error} هذا الأمر للستاف بس.`,
    notAuthor: `${E.error} هذي القائمة لصاحب الأمر بس.`,
    expired: `${E.warning} انتهت مدة هذي القائمة. شغّل الأمر من جديد.`,
    selfGift: `${E.error} ما تقدر تعطي نفسك جائزة.`,
    rewardName: (info: string | null) => info ?? "جائزة من الستاف",
  },
} as const;
