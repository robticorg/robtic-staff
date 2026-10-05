import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";

const E = emojis;

export { formatElapsedDays as formatMembershipDuration } from "../messages/duration.ts";

export const APPLICATION_TYPE_LABELS: Record<string, string> = {
  NORMAL_APPLICATION: "تقديم كاداري جديد في خادم روبتيك",
  TRANSFER_APPLICATION: "نقل رتبك من سيرفر اخر الى خادم روبتيك",
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  DEVELOPER: "مبرمج",
  DESIGNER: "مصمم",
  EDITOR: "ممنتج",
  STAFF: "اداري",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "ولد",
  FEMALE: "بنت",
};

export const GIRL_VERIFICATION_LABELS: Record<string, string> = {
  PENDING: "بانتظار التوثيق",
  VERIFIED: "موثقة",
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الاستلام",
  CLAIMED: "تم الاستلام",
  UNDER_REVIEW: "قيد المراجعة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  CLOSED: "مغلق",
};

export const staffApplicationMessages = {
  firstModal: {
    title: "التقديم أو النقل إلى الطاقم الاداري",
    identityLabel: "الاسم والعمر والمدينة",
    identityPlaceholder: "أحمد\n19\nالرياض",
    typeLabel: "نوع الطلب",
    typePlaceholder: "اختر نوع الطلب",
    recruiterLabel: "مين عرفك على الفريق؟",
    recruiterDescription: "اختياري — اختر اللي عرفك على الفريق لو فيه أحد",
    termsLabel: "أوافق على قوانين وشروط الادارة.",
  },

  validation: {
    termsRequired: `${E.error} لازم توافق على قوانين وشروط الادارة عشان تقدر تقدّم.`,
    identityInvalid: `${E.error} اكتب اسمك وعمرك ومدينتك، كل وحدة في سطر. مثال:\nأحمد\n19\nالرياض`,
    ageInvalid: `${E.error} العمر لازم يكون رقم صحيح.`,
    typeRequired: `${E.error} لازم تختار نوع الطلب.`,
    staffBlacklisted: `${E.error} ما تقدر تقدّم على الادارة لأنك في بلاك ليست الادارة.`,
    alreadyStaff: `${E.error} أنت اداري أصلاً، ما تحتاج تقدّم.`,
    alreadyOpen: (channelId: string) => `${E.warning} عندك طلب مفتوح أصلاً: <#${channelId}>.`,
    sessionExpired: `${E.warning} انتهت مدة الجلسة. ابدأ من جديد من لوحة التكتات.`,
    notYourSession: `${E.error} هذي الخطوة تخص صاحب الطلب بس.`,
  },

  recruiter: {
    notFound: `${E.error} اللي اخترته في «مين عرفك على الفريق؟» مو موجود في السيرفر.`,
    self: `${E.error} ما تقدر تختار نفسك في «مين عرفك على الفريق؟».`,
    bot: `${E.error} ما تقدر تختار بوت في «مين عرفك على الفريق؟».`,
    notEligible: `${E.error} اللي اخترته في «مين عرفك على الفريق؟» لازم يكون أونر أو أعلى. اختر شخص ثاني أو خلّ الخانة فاضية.`,
    usage: `${E.warning} الطريقة: \`!from @owner\``,
    notInApplication: `${E.error} \`!from\` يشتغل داخل تكت تقديم أو نقل بس.`,
    alreadySet: (recruiterId: string) =>
      `${E.warning} المتقدم مسجل من طرف <@${recruiterId}> من قبل. التغيير يحتاج أدمن: \`!from @owner replace\`.`,
    replaceAdminOnly: `${E.error} تغيير اللي عرّف المتقدم على الفريق للأدمن بس.`,
    saved: (applicantId: string, recruiterId: string) =>
      `${E.success} تم تسجيل <@${applicantId}> من طرف <@${recruiterId}>.`,
    replaced: (applicantId: string, recruiterId: string) =>
      `${E.success} تم تغيير اللي عرّف <@${applicantId}> إلى <@${recruiterId}>.`,
  },

  apply: {
    intro: [
      "## التقديم إلى الإدارة",
      "أهلًا بك في قسم التقديم للإدارة في Robtic Community.",
      "-# نشكرك على اهتمامك بالانضمام إلى فريق الإدارة، ونتمنى لك التوفيق في طلبك.",
      "اضغط على الزر بالأسفل للبدء.",
      "## Staff Application",
      "Welcome to the Robtic Community staff application.",
      "-# Thank you for your interest in joining our staff team. We wish you the best of luck with your application.",
      "Click the button below to get started.",
    ],
    startButton: "ابدأ التقديم",
    genderPrompt: "## وش جنسك؟",
    genderPlaceholder: "اختر الجنس",
    girlNotice:
      "إذا كنتِ بنت، لازم يتم التحقق منك عن طريق إدارة البنات قبل إكمال إجراءات التقديم.",
    departmentPrompt: "## تبي تقدم على أي مجال؟",
    departmentPlaceholder: "اختر المجال",
    creating: `${E.loading} جاري فتح الطلب…`,
  },

  transfer: {
    intro: [
      "## النقل إلى الإدارة | Staff Transfer",
      "أهلًا بك في قسم نقل الإدارة في Robtic Community. قبل بدء الطلب، يجب أن يحتوي السيرفر على 4000 عضو على الأقل. راح نطلب منك رابط دعوة السيرفر، والبوت يتحقق من عدد الأعضاء والمتصلين تلقائياً، وبعدها ترفع إثباتاتك.",
      "Welcome to the Robtic Community Staff Transfer. Before applying, the server must have at least 4,000 members. You will be asked for the server invite link — the bot checks the member and online counts itself — then you upload your proof.",
      "نتمنى لك التوفيق في طلبك. | We wish you the best of luck with your application.",
    ],
    startButton: "ابدأ طلب النقل",
    modalTitle: "معلومات النقل",
    inviteLabel: "رابط دعوة السيرفر",
    invitePlaceholder: "https://discord.gg/…",
    inviteRequired: `${E.error} لازم ترسل رابط دعوة السيرفر.`,
    serverUsage: `${E.warning} الطريقة: \`!server <كود-الدعوة>\` — مثال: \`!server ExRgT\` أو \`!server discord.gg/ExRgT\``,
    serverCard: (link: string, name: string, members: number, online: number) =>
      [
        `## ${name}`,
        `**الرابط:** ${link}`,
        `**عدد الأعضاء:** ${members.toLocaleString("en-US")}`,
        `**المتصلين:** ${online.toLocaleString("en-US")}`,
      ].join("\n"),
    inviteInvalid: `${E.error} رابط الدعوة غير صالح أو منتهي. أرسل رابط دائم.`,
    inviteIsHome: `${E.error} هذا رابط ${branding.communityName} نفسه. أرسل رابط السيرفر اللي كنت اداري فيه.`,
    evidencePrompt: (min: number, max: number) =>
      [
        "## الإثباتات",
        `ارفع من ${min} إلى ${max} صور توضّح:`,
        "- السيرفر\n- عدد الأعضاء\n- عدد المتصلين\n- رتبتك\n- ترتيب الرتبة في السيرفر",
      ],
    belowMinimumNotice: (min: number) =>
      `${E.warning} عدد أعضاء السيرفر أقل من ${min.toLocaleString("en-US")}، فطلبك راح يكون غير مؤهل حسب شروط النقل الحالية.`,
    evidenceButton: "رفع الإثباتات",
    evidenceModalTitle: "إثباتات النقل",
    evidenceLabel: "صور الإثبات",
    evidenceTooFew: (min: number) => `${E.error} لازم ترفع ${min} صور على الأقل.`,
    evidenceNotImage: `${E.error} الإثباتات لازم تكون صور بس.`,
    evidenceTooLarge: `${E.error} فيه صورة حجمها كبير. صغّرها وجرب مرة ثانية.`,
    evidenceDownloadFailed: `${E.error} ما قدرت أحفظ الصور. جرب ترفعها مرة ثانية.`,
    creating: `${E.loading} جاري فتح طلب النقل…`,
  },

  create: {
    managerRoleMissing: `${E.error} رتبة المسؤول عن هذا الطلب مو مضبوطة. كلّم الإدارة.`,
    created: (channelId: string) => `${E.success} تم فتح طلبك: <#${channelId}>.`,
    failed: `${E.error} ما قدرت أفتح الطلب. جرب مرة ثانية.`,
  },

  ticket: {
    applicationHeader: (ticketId: string) => `## طلب تقديم · \`${ticketId}\``,
    transferHeader: (ticketId: string) => `## طلب نقل · \`${ticketId}\``,
    applicationOpened: "تم فتح طلب تقديم جديد.\nبانتظار أحد المسؤولين لاستلام الطلب.",
    transferOpened: "تم فتح طلب نقل جديد.\nبانتظار أحد مسؤولي النقل لاستلام الطلب.",
    applicant: (userId: string) => `**المتقدم:** <@${userId}>`,
    type: (label: string) => `**نوع الطلب:** ${label}`,
    department: (label: string) => `**المجال:** ${label}`,
    gender: (label: string) => `**الجنس:** ${label}`,
    managers: (roleIds: readonly string[]) =>
      `**المسؤولين:** ${roleIds.map((id) => `<@&${id}>`).join(" ")}`,
    proposed: (value: string) => `**الرتبة المتوقعة:** ${value}`,
    proposedNote: "-# الرتبة المتوقعة مو قرار نهائي، القرار للمسؤول.",
    status: (label: string) => `-# حالة الطلب: ${label}`,
    ineligibleHeading: `${E.warning} **الطلب غير مؤهل حسب شروط النقل الحالية:**`,
    ineligible: {
      MEMBER_COUNT: (min: number) => `- عدد أعضاء السيرفر أقل من ${min.toLocaleString("en-US")}.`,
    },
    tierNotConfigured: "- رتبة بداية التصنيف المتوقع مو مضبوطة في `/role boundary`.",
    evidenceHeading: (count: number) => `**الإثباتات (${count}):**`,
    closeButton: "إغلاق",
    optionsButton: "خيارات",
    infoButton: "المعلومات",
  },

  info: {
    title: "## معلومات الطلب",
    name: (value: string) => `**الاسم:** ${value}`,
    age: (value: number) => `**العمر:** ${value}`,
    city: (value: string) => `**المدينة:** ${value}`,
    gender: (value: string) => `**الجنس:** ${value}`,
    type: (value: string) => `**نوع التقديم:** ${value}`,
    department: (value: string) => `**المجال:** ${value}`,
    girlVerification: (value: string) => `**حالة التحقق:** ${value}`,
    recruiter: (userId: string | null) =>
      `**مين عرفه على الفريق:** ${userId ? `<@${userId}>` : "ما فيه"}`,
    sourceServer: (value: string) => `**السيرفر:** ${value}`,
    memberCount: (value: number, verified: boolean) =>
      `**عدد أعضاء السيرفر:** ${value.toLocaleString("en-US")}${verified ? " · ✔️ متحقق منه" : ""}`,
    onlineCount: (value: number, verified: boolean) =>
      `**عدد الأعضاء المتصلين:** ${value.toLocaleString("en-US")}${verified ? " · ✔️ متحقق منه" : ""}`,
    roleOrder: (value: number) => `**ترتيب الرتبة:** ${value}`,
    membership: (value: string) => `**مدة وجوده في ${branding.communityName}:** ${value}`,
    proposed: (value: string) => `**الرتبة المتوقعة:** ${value}`,
    evidenceCount: (value: number) => `**عدد الإثباتات:** ${value}`,
    status: (value: string) => `**حالة الطلب:** ${value}`,
    notAllowed: `${E.error} معلومات الطلب لصاحب الطلب والمسؤولين عنه بس.`,
    proposedLevel: (roleId: string | null, level: number) =>
      roleId ? `<@&${roleId}> (المستوى ${level})` : `المستوى ${level}`,
    noProposal: "ما فيه رتبة متوقعة",
  },

  decision: {
    notInApplication: `${E.error} هذا الأمر يشتغل داخل تكت تقديم أو نقل بس.`,
    notManager: `${E.error} هذا للمسؤولين عن هذا الطلب بس.`,
    claimFirst: `${E.warning} استلم الطلب أول قبل ما تتخذ قرار.`,
    wrongTarget: (applicantId: string) =>
      `${E.error} هذا التكت يخص <@${applicantId}> بس — ما تقدر تقبل عضو ثاني من هنا.`,
    applicantGone: `${E.error} المتقدم ما عاد موجود في السيرفر.`,
    alreadyStaff: (userId: string) => `${E.warning} <@${userId}> صار عضو في الطاقم الاداري أصلاً.`,
    alreadyDecided: `${E.warning} تم اتخاذ قرار في هذا الطلب من قبل.`,
    ineligible: `${E.error} هذا الطلب غير مؤهل حسب شروط النقل الحالية، ما يمكن قبوله.`,
    noProposal: `${E.error} ما فيه رتبة متوقعة لهذا الطلب. حدد المستوى بنفسك: \`!accept 40\`.`,
    selfDecision: `${E.error} ما تقدر تتخذ قرار في طلبك أنت.`,
    refuseUsage: `${E.warning} الطريقة: \`!refuse <السبب>\``,
    refused: (userId: string) => `${E.success} تم رفض طلب <@${userId}>.`,
    refusedNotice: (reason: string) => `${E.error} **تم رفض الطلب.**\n**السبب:** ${reason}`,
    acceptedNotice: (userId: string, level: number) =>
      `${E.success} **تم قبول <@${userId}> في الطاقم الاداري على المستوى ${level}.**`,
  },

  verify: {
    usage: `${E.warning} الطريقة: \`!verify @user\``,
    notAllowed: `${E.error} التوثيق لإدارة البنات والأدمن بس.`,
    verifiedRoleMissing: `${E.error} رتبة «بنت موثقة» مو مضبوطة. شغّل \`/role set\` أول.`,
    alreadyVerified: (userId: string) => `${E.warning} <@${userId}> موثقة من قبل.`,
    done: (userId: string) => `${E.success} تم توثيق <@${userId}>.`,
    ticketNotice: (managerId: string) => `${E.success} تم توثيق المتقدمة بواسطة <@${managerId}>.`,
    failed: `${E.error} ما قدرت أعدل رتب العضوة. تأكد إن رتبتي فوق رتب التوثيق.`,
  },
} as const;
