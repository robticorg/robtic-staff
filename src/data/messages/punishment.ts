import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";

const E = emojis;

export const punishmentMessages = {
  resolution: {
    prompt: (caseId: string) =>
      `${E.report} **إنهاء \`${caseId}\`** — اختر الإجراء اللي راح يتاخذ ضد الشخص المُبلَّغ عنه.`,
    selectPlaceholder: "اختر الإجراء…",
    options: {
      NO_ACTION: { label: "بدون إجراء", description: "إغلاق البلاغ بدون عقوبة" },
      WARN: { label: "تحذير", description: "إصدار تحذير للعضو (عن طريق نظام التحذيرات)" },
      TIMEOUT: { label: "تايم أوت", description: "تايم أوت ديسكورد لمدة تختارها" },
      MUTE: { label: "ميوت", description: "إعطاء رتبة الميوت المضبوطة" },
      JAIL: { label: "سجن", description: "إعطاء رتبة السجن المضبوطة" },
      KICK: { label: "كيك", description: "طلب كيك (يحتاج موافقة مانجر الشات)" },
      BAN: { label: "باند", description: "طلب باند (يحتاج موافقة أدمن)" },
    },
    notInThread: `${E.error} الإنهاء يبدأ داخل ثريد التحقيق بالبلاغ بس.`,
    notAllowed: `${E.error} أنت مو مسؤول عن هذا البلاغ.`,
    claimFirst: `${E.warning} استلم البلاغ قبل ما تنهيه.`,
    alreadyClosed: `${E.error} هذا البلاغ مغلق أصلاً.`,
    expired: `${E.error} نافذة الإنهاء انتهت. شغّل \`!انهاء\` مرة ثانية.`,
    reasonModalTitle: (type: string) => `${type} — السبب`.slice(0, 45),
    reasonLabel: "السبب (يتسجل على العقوبة، منفصل عن البلاغ)",
    reasonPlaceholder: "ليش هذا الإجراء يتاخذ؟",
    reasonRequired: `${E.error} لازم تكتب سبب لهذا الإجراء.`,
    durationRequired: `${E.error} اختر مدة التايم أوت.`,
    durationLabel: "مدة التايم أوت",
    recorded: (type: string) => `${E.success} تم تسجيل الإجراء: **${type}**.`,
    executed: (type: string) => `${E.success} تم تنفيذ **${type}**.`,
    executeFailed: (type: string) => `${E.error} ما قدرت أنفّذ **${type}** — تم تسجيله كـ FAILED.`,
    pendingApproval: (type: string, channelId: string) =>
      `${E.warning} تم إرسال طلب **${type}** إلى <#${channelId}> للموافقة.`,
    approvalChannelMissing: (type: string) =>
      `${E.error} روم موافقة ${type} مو مضبوط. اطلب من الأدمن يشغّل \`/channels set\`. ما تم تنفيذ شي.`,
    targetLeftForKick: `${E.error} هذا الشخص ما عاد في السيرفر — ما فيه شي نسويه كيك.`,
    targetNotInGuild: `${E.error} هذا الشخص ما عاد في السيرفر، فما يمكن تطبيق هذا الإجراء.`,
    roleNotConfigured: (which: string) =>
      `${E.error} رتبة ${which} مو مضبوطة (\`/role ${which.toLowerCase()}\`). ما تم تنفيذ شي.`,
    botMissingPermission: (perm: string) =>
      `${E.error} ناقصني صلاحية **${perm}**. ما تم تنفيذ شي.`,
    roleHierarchy: `${E.error} أعلى رتبة عندي مو فوق الهدف — ما أقدر أطبّق عليه.`,
    targetIsSelf: `${E.error} ما تقدر تنهي بلاغ ضد نفسك.`,
    targetIsBot: `${E.error} هذا الهدف بوت.`,
  },

  approval: {
    cardHeading: (type: string) => `${E.report} **طلب عقوبة — ${type}**`,
    target: (userId: string) => `**الهدف:** <@${userId}> (\`${userId}\`)`,
    requestedBy: (userId: string) => `**مقدّم الطلب:** <@${userId}>`,
    reason: (reason: string) => `**السبب:** ${reason}`,
    report: (reportId: string) => `**البلاغ:** \`${reportId}\``,
    evidence: (count: number) => `**الأدلة:** ${count} عنصر`,
    noEvidence: "**الأدلة:** ما فيه شي مرفق",
    statusPending: "**الحالة:** قيد المراجعة",
    statusApproved: (userId: string) => `**الحالة:** وافق عليه <@${userId}>`,
    statusRejected: (userId: string) => `**الحالة:** رفضه <@${userId}>`,
    statusExecuted: "**الحالة:** تم التنفيذ",
    statusFailed: "**الحالة:** فشل التنفيذ",
    statusExpired: "**الحالة:** منتهي",
    approveButton: "موافقة",
    rejectButton: "رفض",
    infoButton: "معلومات",
    notAuthorizedBan: `${E.error} الموافقة على طلبات الباند أو رفضها للأدمن بس.`,
    notAuthorizedKick: `${E.error} الموافقة على طلبات الكيك أو رفضها لمانجرات الشات بس.`,
    selfApproval: `${E.error} ما تقدر توافق على طلب عقوبة قدّمته أنت.`,
    alreadyDecided: `${E.error} تم البت في هذه العقوبة من قبل.`,
    gone: `${E.error} طلب الموافقة هذا ما عاد موجود.`,
    approvedAck: (type: string) => `${E.success} تمت الموافقة. جاري تنفيذ ${type}…`,
    rejectedAck: `${E.success} تم الرفض.`,
    rejectModalTitle: "رفض طلب العقوبة",
    rejectReasonLabel: "سبب الرفض",
    rejectReasonPlaceholder: "ليش هذا الطلب مرفوض؟",
    infoTitle: (type: string) => `${E.locked} **طلب ${type}** — التفاصيل`,
    infoLine: (label: string, value: string) => `**${label}:** ${value}`,
  },

  log: {
    heading: `${E.report} **عقوبة**`,
    line: (label: string, value: string) => `**${label}:** ${value}`,
    target: (userId: string) => `<@${userId}> (\`${userId}\`)`,
    none: "—",
  },

  dm: {
    body: (serverName: string, typeLabel: string, reason: string) =>
      [
        `استلمت عقوبة في **${serverName}**.`,
        "",
        `**العقوبة:** ${typeLabel}`,
        `**السبب:** ${reason}`,
        "",
        "لو تشوف إن العقوبة غلط، تقدر تقدّم استئناف عن طريق البوت.",
      ].join("\n"),
    whyButton: "ليش تعاقبت؟",
    whyInfo: (typeLabel: string, reason: string, evidence: string[], issuedAt?: Date) =>
      [
        `**العقوبة:** ${typeLabel}`,
        `**السبب:** ${reason}`,
        issuedAt ? `**تاريخ الإصدار:** <t:${Math.floor(issuedAt.getTime() / 1000)}:f>` : null,
        "",
        evidence.length ? `**الأدلة:**\n${evidence.join("\n")}` : "**الأدلة:** ما فيه شي",
      ]
        .filter((l): l is string => l !== null)
        .join("\n"),
    windowExpired:
      "انتهت مدة عرض أدلة هذه العقوبة. افتح تكت دعم لو تحتاج مساعدة إضافية.",
    notYours: `${E.error} هذي مو عقوبتك.`,
    gone: `${E.error} سجل العقوبة هذا ما لقيته.`,
  },

  labels: {
    NO_ACTION: "بدون إجراء",
    WARN: "تحذير",
    TIMEOUT: "تايم أوت",
    MUTE: "ميوت",
    JAIL: "سجن",
    KICK: "كيك",
    BAN: "باند",
  } as Record<string, string>,

  serverName: branding.communityName,
} as const;
