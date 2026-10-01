import { emojis } from "../emojis/index.ts";

const E = emojis;
const date = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:f>`;
const relative = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;

export const responsibilityMessages = {
  command: {
    description: "إضافة مسؤولية جديدة مربوطة برتبة وصلاحية",
  },

  modal: {
    title: "إضافة مسؤولية",
    roleLabel: "الرتبة",
    roleDescription: "الرتبة اللي تنعطى لصاحب المسؤولية",
    permissionLabel: "الصلاحية",
    permissionDescription: "الصلاحية الموجودة في البوت اللي تعطيها المسؤولية",
    permissionPlaceholder: "اختر الصلاحية",
    titleLabel: "اسم المسؤولية",
    titlePlaceholder: "مثال: إدارة الشات",
    descriptionLabel: "وصف المسؤولية",
    descriptionPlaceholder: "مثال: مسؤول عن إدارة ومتابعة الشات",
    durationLabel: "المدة (للمسؤولية المؤقتة)",
    durationPlaceholder: "مثال: 7d أو 12h — اتركه فاضي لو المسؤولية دائمة",
  },

  create: {
    created: (title: string, roleId: string, permission: string, duration: string | null) =>
      [
        `${E.success} تم إنشاء المسؤولية **${title}**.`,
        `**الرتبة:** <@&${roleId}>`,
        `**الصلاحية:** ${permission}`,
        `**النوع:** ${duration ? `مؤقتة — ${duration}` : "دائمة"}`,
        "",
        "اختر التصنيف من القائمة تحت:",
      ].join("\n"),
    categoryPlaceholder: "اختر تصنيف المسؤولية",
    categorySet: (title: string, category: string) => `${E.success} تصنيف **${title}** صار **${category}**.`,
    roleRequired: `${E.error} لازم تختار رتبة.`,
    roleEveryone: `${E.error} رتبة @everyone ما تنفع كمسؤولية.`,
    roleManaged: `${E.error} هذي الرتبة تابعة لبوت أو تطبيق وما تنعطى يدوياً.`,
    roleUnmanageable: `${E.error} رتبة البوت لازم تكون فوق هذي الرتبة عشان يقدر يعطيها ويشيلها.`,
    roleTaken: (title: string) => `${E.error} هذي الرتبة مربوطة أصلاً بمسؤولية **${title}**.`,
    titleTaken: (title: string) => `${E.error} فيه مسؤولية اسمها **${title}** أصلاً.`,
    permissionInvalid: `${E.error} الصلاحية المختارة غير موجودة في البوت.`,
    fieldsRequired: `${E.error} الاسم والوصف مطلوبين.`,
    durationInvalid: `${E.error} المدة غير صحيحة — اكتبها مثل \`7d\` أو \`12h\`، وبحد أقصى 365 يوم.`,
  },

  assign: {
    menuTitle: (userId: string) => `## اختر المسؤولية\nللعضو <@${userId}>`,
    menuPlaceholder: "اختر المسؤولية",
    nothingToAssign: `${E.warning} ما فيه مسؤوليات تقدر تعطيها لهذا العضو.`,
    done: (title: string, userId: string, expiresAt: Date | null) =>
      `${E.success} تم إعطاء <@${userId}> مسؤولية **${title}**${expiresAt ? ` — تنتهي ${relative(expiresAt)}` : ""}.`,
    menuDone: (title: string, userId: string) => `${E.success} تم إعطاء <@${userId}> مسؤولية **${title}**.`,
    already: `${E.warning} هذا المستخدم لديه هذه المسؤولية بالفعل.`,
  },

  remove: {
    menuTitle: (userId: string) => `## اختر المسؤولية المراد إزالتها\nمن العضو <@${userId}>`,
    menuPlaceholder: "اختر المسؤولية المراد إزالتها",
    none: `${E.warning} هذا المستخدم لا يملك أي مسؤوليات حالياً.`,
    nothingYouCanRemove: `${E.warning} ما تقدر تشيل أي مسؤولية من مسؤوليات هذا العضو.`,
    done: (title: string, userId: string) => `${E.success} تم إزالة مسؤولية **${title}** من <@${userId}>.`,
    menuDone: (title: string, userId: string) => `${E.success} تم إزالة مسؤولية **${title}** من <@${userId}>.`,
    notActive: `${E.warning} هذي المسؤولية انتهت أو انشالت أصلاً.`,
  },

  errors: {
    usage: `${E.warning} الطريقة: \`!مسؤولية @عضو\` — وللإزالة: \`!مسؤولية ازالة @عضو\``,
    notAllowed: `${E.error} ما عندك صلاحية تعطي أو تشيل هذي المسؤولية.`,
    notAllowedAny: `${E.error} ما عندك صلاحية تدير المسؤوليات.`,
    notFound: `${E.error} هذي المسؤولية ما عادت موجودة.`,
    targetGone: `${E.error} العضو مو موجود في السيرفر.`,
    targetBot: `${E.error} ما تقدر تعطي بوت مسؤولية.`,
    self: `${E.error} ما تقدر تعطي أو تشيل مسؤولية من نفسك.`,
    roleMissing: `${E.error} رتبة هذي المسؤولية انحذفت من السيرفر — لازم الأدمن يعدّلها.`,
    roleUnmanageable: `${E.error} ما أقدر أدير رتبة هذي المسؤولية — رتبة البوت لازم تكون فوقها.`,
    roleFailed: `${E.error} ديسكورد رفض إعطاء الرتبة، والمسؤولية ما انحفظت.`,
    notYours: `${E.error} هذي القائمة لصاحب الأمر بس.`,
    adminOnly: `${E.error} هذا للأدمن بس.`,
  },

  stats: {
    heading: "### المسؤوليات",
    row: (title: string, lead: string | null, expiresAt: Date | null) =>
      `• **${title}**${expiresAt ? ` (تنتهي ${relative(expiresAt)})` : ""}${lead ? ` — مسؤولك: ${lead}` : ""}`,
    none: "-# ما عنده مسؤوليات.",
  },

  log: {
    assigned: "### مسؤولية جديدة",
    removed: "### إزالة مسؤولية",
    expired: "### انتهاء مسؤولية مؤقتة",
    restored: "### إرجاع رتبة مسؤولية",
    problem: "### مشكلة في إعدادات مسؤولية",
    member: "العضو",
    responsibility: "المسؤولية",
    role: "الرتبة",
    by: "بواسطة",
    expiresAt: "تنتهي",
    note: "ملاحظة",
    at: date,
    restoredNote: "الرتبة انشالت يدوياً والمسؤولية ما زالت فعّالة — تم إرجاعها.",
    roleMissingNote: "رتبة المسؤولية ما عادت موجودة في السيرفر.",
    roleUnmanageableNote: "رتبة البوت تحت رتبة المسؤولية — ما قدر يديرها.",
  },
} as const;
