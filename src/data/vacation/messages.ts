import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";

const E = emojis;

export const vacationMessages = {
  serverName: branding.communityName,

  break: {
    usage: `${E.warning} الطريقة: \`!بريك @عضو <المدة>\` — مثال: \`5m\` \`3d\` \`1w\` \`1M\``,
    invalidDuration: `${E.error} مدة غير صحيحة. استخدم \`5m\` (دقائق)، \`3d\` (أيام)، \`1w\` (أسابيع) أو \`1M\` (شهور).`,
    reasonPlaceholder: "بريك بطلب من مانجر الستاف",
    targetNotStaff: (mention: string) => `${E.error} ${mention} مو عضو ستاف.`,
    targetNotInGuild: `${E.error} هذا العضو مو موجود في السيرفر.`,
    alreadyOnVacation: (mention: string) => `${E.error} ${mention} عنده إجازة / بريك مفتوح أصلاً.`,
    roleNotConfigured: `${E.error} رتبة الإجازة مو مضبوطة. شغّل \`/role vacation @role\` أول.`,
    roleMissing: `${E.error} رتبة الإجازة المضبوطة ما عادت موجودة. أعد تشغيل \`/role vacation\`.`,
    hierarchy: `${E.error} ما أقدر أدير رتب هذا العضو — حرّك رتبتي فوق رتبته (ورتبة الإجازة).`,
    botMissingPermission: `${E.error} ناقصني صلاحية **Manage Roles**.`,
    discordFailed: `${E.error} ديسكورد رفض تغيير الرتبة — ما تم تطبيق شي. جرب مرة ثانية.`,
    done: (mention: string, duration: string, endsAt: Date) =>
      `${E.success} ${mention} الحين في بريك لمدة **${duration}** — يرجع <t:${Math.floor(
        endsAt.getTime() / 1000,
      )}:R>.`,
  },

  unbreak: {
    usage: `${E.warning} الطريقة: \`!انهاء-بريك @عضو\``,
    notOnVacation: (mention: string) => `${E.error} ${mention} مو في إجازة / بريك حالياً.`,
    targetNotInGuild: `${E.warning} هذا العضو مو موجود في السيرفر — تم إلغاء الإجازة بس ما قدرنا نرجّع الرتب.`,
    done: (mention: string) => `${E.success} تم إنهاء بريك ${mention} ورجعنا رتب الستاف حقه.`,
    doneNoRestore: (mention: string) =>
      `${E.warning} تم إنهاء بريك ${mention}، بس بعض الرتب المحفوظة ما عادت موجودة وتم تجاوزها.`,
  },

  panel: {
    setupDeployed: (channelId: string) => `${E.success} تم نشر لوحة الإجازات في <#${channelId}>.`,
    setupUpdated: (channelId: string) => `${E.success} تم تحديث لوحة الإجازات في <#${channelId}>.`,
    setupChannelInvalid: `${E.error} لازم يتشغّل هذا الأمر في روم نصي عادي.`,
  },

  application: {
    modalTitle: "تقديم على إجازة",
    reasonLabel: "السبب",
    reasonQuestion: "ليش تحتاج إجازة؟",
    durationLabel: "المدة",
    durationHint: "الرقم = أيام (مثال: 7). أضف m للشهور (مثال: 1m).",
    notStaff: `${E.error} التقديم على إجازة لأعضاء الستاف بس.`,
    alreadyOnVacation: `${E.error} عندك إجازة مفتوحة أو طلب قيد المراجعة أصلاً.`,
    reasonRequired: `${E.error} لازم تكتب سبب.`,
    invalidDuration: `${E.error} مدة غير صحيحة. أدخل عدد أيام (مثال: \`7\`) أو شهور (مثال: \`1m\`).`,
    roleNotConfigured: `${E.error} نظام الإجازات لسا مو مضبوط بالكامل. كلّم الأدمن.`,
    channelNotConfigured: `${E.error} نظام الإجازات لسا مو مضبوط بالكامل. كلّم الأدمن.`,
    channelUnavailable: `${E.error} روم طلبات الإجازات فيه خطأ بالإعداد. كلّم الأدمن.`,
    submitted: (duration: string) =>
      `${E.success} تم إرسال طلب إجازتك لمدة **${duration}** وهو قيد المراجعة.`,
  },

  request: {
    heading: `${E.system} **طلب إجازة**`,
    staff: (userId: string) => `**عضو الستاف:** <@${userId}> (\`${userId}\`)`,
    duration: (duration: string) => `**المدة:** ${duration}`,
    window: (startsAt: Date, endsAt: Date) =>
      `**الفترة:** <t:${Math.floor(startsAt.getTime() / 1000)}:f> → <t:${Math.floor(
        endsAt.getTime() / 1000,
      )}:f>`,
    reason: (reason: string) => `**السبب:** ${reason}`,
    statusPending: "**الحالة:** قيد المراجعة",
    statusApproved: (userId: string) => `**الحالة:** وافق عليه <@${userId}>`,
    statusRejected: (userId: string) => `**الحالة:** رفضه <@${userId}>`,
    statusActive: (userId: string) => `**الحالة:** وافق عليه <@${userId}> — الإجازة فعّالة`,
    approveButton: "قبول",
    refuseButton: "رفض",
    infoButton: "معلومات",
    notAuthorized: `${E.error} البت في طلبات الإجازات لمانجرات الستاف بس.`,
    alreadyDecided: `${E.error} تم البت في طلب الإجازة هذا من قبل.`,
    gone: `${E.error} طلب الإجازة هذا ما عاد موجود.`,
    applicantGone: `${E.error} مقدّم الطلب ما عاد في السيرفر.`,
    applicantNotStaff: `${E.error} مقدّم الطلب ما عاد عضو ستاف.`,
    approvedAck: `${E.success} تمت الموافقة — الإجازة الحين فعّالة.`,
    rejectedAck: `${E.success} تم رفض طلب الإجازة.`,
    activationFailed: `${E.error} ما قدرت أطبّق رتب الإجازة — الطلب ظل قيد المراجعة. جرب مرة ثانية.`,
    refuseModalTitle: "رفض طلب الإجازة",
    refuseReasonLabel: "سبب الرفض",
    refuseReasonRequired: `${E.error} لازم تكتب سبب للرفض.`,
    infoTitle: `${E.locked} **طلب الإجازة — التفاصيل**`,
    infoLine: (label: string, value: string) => `**${label}:** ${value}`,
  },

  dm: {
    submitted: (duration: string) =>
      [
        "تم إرسال طلب إجازتك.",
        "",
        `**المدة:** ${duration}`,
        "**الحالة:** قيد المراجعة",
      ].join("\n"),
    approved: (endsAt: Date) =>
      [
        "تمت الموافقة على طلب إجازتك.",
        "",
        `إجازتك تنتهي في: <t:${Math.floor(endsAt.getTime() / 1000)}:F>`,
      ].join("\n"),
    rejected: (reason: string) =>
      ["تم رفض طلب إجازتك.", "", "**السبب:**", reason].join("\n"),
    completed:
      "انتهت إجازتك ورجعت رتب الستاف حقك.",
    brokenByManager:
      "مانجر ستاف أنهى بريكك بدري. رجعت رتب الستاف حقك.",
    startedByManager: (duration: string, endsAt: Date) =>
      [
        `مانجر ستاف حطّك في بريك في **${branding.communityName}**.`,
        "",
        `**المدة:** ${duration}`,
        `بريكك ينتهي في: <t:${Math.floor(endsAt.getTime() / 1000)}:F>`,
      ].join("\n"),
  },
} as const;
