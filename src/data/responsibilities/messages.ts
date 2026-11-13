import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const date = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:f>`;
const relative = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;

export const responsibilityMessages = bilingual(
  {
    command: {
      description: "Add a responsibility tied to a role and a permission",
    },

    modal: {
      title: "Add responsibility",
      roleLabel: "Role",
      roleDescription: "Given to whoever holds the responsibility",
      permissionLabel: "Permission",
      permissionDescription: "The bot permission it grants",
      permissionPlaceholder: "Choose a permission",
      titleLabel: "Name",
      titlePlaceholder: "e.g. Chat management",
      descriptionLabel: "Description",
      descriptionPlaceholder: "e.g. Looks after the chat",
      durationLabel: "Duration (for a temporary one)",
      durationPlaceholder: "e.g. 7d or 12h; leave empty for permanent",
    },

    create: {
      created: (title: string, roleId: string, permission: string, duration: string | null) =>
        [
          `${E.success} Responsibility **${title}** created.`,
          `**Role:** <@&${roleId}> · **Permission:** ${permission} · **Type:** ${duration ? `temporary, ${duration}` : "permanent"}`,
          "Pick its category below:",
        ].join("\n"),
      categoryPlaceholder: "Choose a category",
      categorySet: (title: string, category: string) => `${E.success} **${title}** is now in **${category}**.`,
      roleRequired: `${E.error} Choose a role.`,
      roleEveryone: `${E.error} @everyone can't be a responsibility.`,
      roleManaged: `${E.error} That role belongs to a bot or app and can't be given by hand.`,
      roleUnmanageable: `${E.error} My role must be above it to give and remove it.`,
      roleTaken: (title: string) => `${E.error} That role is already tied to **${title}**.`,
      titleTaken: (title: string) => `${E.error} **${title}** already exists.`,
      permissionInvalid: `${E.error} That permission doesn't exist in the bot.`,
      fieldsRequired: `${E.error} Name and description are required.`,
      durationInvalid: `${E.error} Invalid duration. Use \`7d\` or \`12h\`, up to 365 days.`,
    },

    assign: {
      menuTitle: (userId: string) => `## Choose a responsibility\nFor <@${userId}>`,
      menuPlaceholder: "Choose a responsibility",
      nothingToAssign: `${E.warning} No responsibilities you can give them.`,
      done: (title: string, userId: string, expiresAt: Date | null) => `${E.success} <@${userId}> now has **${title}**${expiresAt ? `, ends ${relative(expiresAt)}` : ""}.`,
      menuDone: (title: string, userId: string) => `${E.success} <@${userId}> now has **${title}**.`,
      already: `${E.warning} They already have this responsibility.`,
    },

    manage: {
      title: (userId: string) => `## <@${userId}>'s responsibilities`,
      hint: "What do you want to do?",
      giveButton: "Give",
      takeButton: "Remove",
      giveModalTitle: "Give responsibility",
      takeModalTitle: "Remove responsibility",
      giveLabel: "Responsibilities to give",
      takeLabel: "Responsibilities to remove",
      nothingPicked: `${E.warning} Nothing selected.`,
    },

    remove: {
      menuTitle: (userId: string) => `## Remove a responsibility\nFrom <@${userId}>`,
      menuPlaceholder: "Choose one to remove",
      none: `${E.warning} They have no responsibilities.`,
      nothingYouCanRemove: `${E.warning} You can't remove any of theirs.`,
      done: (title: string, userId: string) => `${E.success} **${title}** removed from <@${userId}>.`,
      menuDone: (title: string, userId: string) => `${E.success} **${title}** removed from <@${userId}>.`,
      notActive: `${E.warning} That responsibility already ended.`,
    },

    errors: {
      usage: `${E.warning} Usage: \`!responsibility @member\`; to remove: \`!responsibility remove @member\``,
      notAllowed: `${E.error} You can't give or remove this responsibility.`,
      notAllowedAny: `${E.error} You can't manage responsibilities.`,
      notFound: `${E.error} That responsibility no longer exists.`,
      targetGone: `${E.error} That member isn't in the server.`,
      targetBot: `${E.error} A bot can't hold a responsibility.`,
      self: `${E.error} You can't change your own responsibilities.`,
      roleMissing: `${E.error} Its role was deleted. An admin needs to fix it.`,
      roleUnmanageable: `${E.error} I can't manage its role; mine must be above it.`,
      roleFailed: `${E.error} Discord refused the role, so nothing was saved.`,
      notYours: `${E.error} This menu is for whoever ran the command.`,
      adminOnly: `${E.error} Admins only.`,
    },

    stats: {
      heading: "### Responsibilities",
      row: (title: string, lead: string | null, expiresAt: Date | null) => `• **${title}**${expiresAt ? ` (ends ${relative(expiresAt)})` : ""}${lead ? ` — lead: ${lead}` : ""}`,
      none: "-# None.",
    },

    log: {
      assigned: "### Responsibility given",
      removed: "### Responsibility removed",
      expired: "### Temporary responsibility ended",
      problem: "### Responsibility setup problem",
      member: "Member",
      responsibility: "Responsibility",
      role: "Role",
      by: "By",
      expiresAt: "Ends",
      note: "Note",
      at: date,
      manualRemovedNote: "The role was removed by hand; the responsibility was ended.",
      manualAddedNote: "The role was given by hand; the responsibility was recorded.",
      roleMissingNote: "The responsibility's role no longer exists.",
      roleUnmanageableNote: "My role is below the responsibility's role.",
    },
  },
  {
    command: {
      description: "إضافة مسؤولية مربوطة برتبة وصلاحية",
    },

    modal: {
      title: "إضافة مسؤولية",
      roleLabel: "الرتبة",
      roleDescription: "تنعطى لصاحب المسؤولية",
      permissionLabel: "الصلاحية",
      permissionDescription: "صلاحية البوت اللي تعطيها",
      permissionPlaceholder: "اختر الصلاحية",
      titleLabel: "الاسم",
      titlePlaceholder: "مثال: إدارة الشات",
      descriptionLabel: "الوصف",
      descriptionPlaceholder: "مثال: متابعة الشات",
      durationLabel: "المدة (للمؤقتة)",
      durationPlaceholder: "مثال: 7d أو 12h، فاضي = دائمة",
    },

    create: {
      created: (title: string, roleId: string, permission: string, duration: string | null) =>
        [
          `${E.success} تم إنشاء مسؤولية **${title}**.`,
          `**الرتبة:** <@&${roleId}> · **الصلاحية:** ${permission} · **النوع:** ${duration ? `مؤقتة، ${duration}` : "دائمة"}`,
          "اختر التصنيف تحت:",
        ].join("\n"),
      categoryPlaceholder: "اختر التصنيف",
      categorySet: (title: string, category: string) => `${E.success} صار تصنيف **${title}** هو **${category}**.`,
      roleRequired: `${E.error} اختر رتبة.`,
      roleEveryone: `${E.error} @everyone ما تنفع.`,
      roleManaged: `${E.error} الرتبة تابعة لبوت أو تطبيق وما تنعطى يدوياً.`,
      roleUnmanageable: `${E.error} لازم رتبتي فوقها عشان أعطيها وأشيلها.`,
      roleTaken: (title: string) => `${E.error} الرتبة مربوطة أصلاً بـ **${title}**.`,
      titleTaken: (title: string) => `${E.error} **${title}** موجودة أصلاً.`,
      permissionInvalid: `${E.error} الصلاحية غير موجودة في البوت.`,
      fieldsRequired: `${E.error} الاسم والوصف مطلوبين.`,
      durationInvalid: `${E.error} مدة غير صحيحة. اكتب \`7d\` أو \`12h\`، بحد أقصى 365 يوم.`,
    },

    assign: {
      menuTitle: (userId: string) => `## اختر المسؤولية\nلـ <@${userId}>`,
      menuPlaceholder: "اختر المسؤولية",
      nothingToAssign: `${E.warning} ما فيه مسؤوليات تقدر تعطيها له.`,
      done: (title: string, userId: string, expiresAt: Date | null) => `${E.success} صار عند <@${userId}> مسؤولية **${title}**${expiresAt ? `، تنتهي ${relative(expiresAt)}` : ""}.`,
      menuDone: (title: string, userId: string) => `${E.success} صار عند <@${userId}> مسؤولية **${title}**.`,
      already: `${E.warning} عنده هذي المسؤولية أصلاً.`,
    },

    manage: {
      title: (userId: string) => `## مسؤوليات <@${userId}>`,
      hint: "وش تبي تسوي؟",
      giveButton: "إعطاء",
      takeButton: "إزالة",
      giveModalTitle: "إعطاء مسؤولية",
      takeModalTitle: "إزالة مسؤولية",
      giveLabel: "المسؤوليات للإعطاء",
      takeLabel: "المسؤوليات للإزالة",
      nothingPicked: `${E.warning} ما اخترت شيء.`,
    },

    remove: {
      menuTitle: (userId: string) => `## إزالة مسؤولية\nمن <@${userId}>`,
      menuPlaceholder: "اختر للإزالة",
      none: `${E.warning} ما عنده مسؤوليات.`,
      nothingYouCanRemove: `${E.warning} ما تقدر تشيل أي من مسؤولياته.`,
      done: (title: string, userId: string) => `${E.success} تمت إزالة **${title}** من <@${userId}>.`,
      menuDone: (title: string, userId: string) => `${E.success} تمت إزالة **${title}** من <@${userId}>.`,
      notActive: `${E.warning} المسؤولية منتهية أصلاً.`,
    },

    errors: {
      usage: `${E.warning} الطريقة: \`!مسؤولية @عضو\`، وللإزالة: \`!مسؤولية ازالة @عضو\``,
      notAllowed: `${E.error} ما تقدر تعطي أو تشيل هذي المسؤولية.`,
      notAllowedAny: `${E.error} ما تقدر تدير المسؤوليات.`,
      notFound: `${E.error} المسؤولية ما عادت موجودة.`,
      targetGone: `${E.error} العضو مو موجود في السيرفر.`,
      targetBot: `${E.error} البوت ما ياخذ مسؤولية.`,
      self: `${E.error} ما تقدر تعدّل مسؤولياتك.`,
      roleMissing: `${E.error} رتبتها انحذفت، لازم الأدمن يعدّلها.`,
      roleUnmanageable: `${E.error} ما أقدر أدير رتبتها، لازم رتبتي فوقها.`,
      roleFailed: `${E.error} ديسكورد رفض الرتبة وما انحفظ شيء.`,
      notYours: `${E.error} القائمة لصاحب الأمر بس.`,
      adminOnly: `${E.error} للأدمن بس.`,
    },

    stats: {
      heading: "### المسؤوليات",
      row: (title: string, lead: string | null, expiresAt: Date | null) => `• **${title}**${expiresAt ? ` (تنتهي ${relative(expiresAt)})` : ""}${lead ? ` — مسؤولك: ${lead}` : ""}`,
      none: "-# ما عنده مسؤوليات.",
    },

    log: {
      assigned: "### مسؤولية جديدة",
      removed: "### إزالة مسؤولية",
      expired: "### انتهاء مسؤولية مؤقتة",
      problem: "### مشكلة في إعداد مسؤولية",
      member: "العضو",
      responsibility: "المسؤولية",
      role: "الرتبة",
      by: "بواسطة",
      expiresAt: "تنتهي",
      note: "ملاحظة",
      at: date,
      manualRemovedNote: "انشالت الرتبة يدوياً، وانتهت المسؤولية.",
      manualAddedNote: "انعطت الرتبة يدوياً، وانسجلت المسؤولية.",
      roleMissingNote: "رتبة المسؤولية ما عادت موجودة.",
      roleUnmanageableNote: "رتبتي تحت رتبة المسؤولية.",
    },
  },
);
