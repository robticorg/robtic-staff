import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const S = branding.communityName;
const t = (at: Date, style: string) => `<t:${Math.floor(at.getTime() / 1000)}:${style}>`;

export const vacationMessages = bilingual(
  {
    serverName: S,

    break: {
      usage: `${E.warning} Usage: \`!break @member <duration>\`, e.g. \`5m\` \`3d\` \`1w\` \`1M\``,
      invalidDuration: `${E.error} Invalid duration. Use \`5m\` (minutes), \`3d\` (days), \`1w\` (weeks) or \`1M\` (months).`,
      reasonPlaceholder: "Break set by a staff manager",
      targetNotStaff: (mention: string) => `${E.error} ${mention} isn't staff.`,
      targetNotInGuild: `${E.error} That member isn't in the server.`,
      alreadyOnVacation: (mention: string) => `${E.error} ${mention} already has a vacation or break open.`,
      roleNotConfigured: `${E.error} The vacation role isn't set (dashboard → Ranks & roles).`,
      roleMissing: `${E.error} The vacation role no longer exists. Set it again.`,
      hierarchy: `${E.error} I can't manage their roles. Move my role above theirs (and the vacation role).`,
      botMissingPermission: `${E.error} I'm missing **Manage Roles**.`,
      discordFailed: `${E.error} Discord refused the role change; nothing was applied. Try again.`,
      done: (mention: string, duration: string, endsAt: Date) => `${E.success} ${mention} is on break for **${duration}**, back ${t(endsAt, "R")}.`,
    },

    unbreak: {
      usage: `${E.warning} Usage: \`!unbreak @member\``,
      notOnVacation: (mention: string) => `${E.error} ${mention} isn't on a vacation or break.`,
      targetNotInGuild: `${E.warning} They're not in the server. The vacation was ended, but roles couldn't be restored.`,
      done: (mention: string) => `${E.success} ${mention}'s break ended; staff roles restored.`,
      doneNoRestore: (mention: string) => `${E.warning} ${mention}'s break ended, but some saved roles no longer exist and were skipped.`,
    },

    panel: {
      setupDeployed: (channelId: string) => `${E.success} Vacation panel posted in <#${channelId}>.`,
      setupUpdated: (channelId: string) => `${E.success} Vacation panel updated in <#${channelId}>.`,
      setupChannelInvalid: `${E.error} Run this in a regular text channel.`,
    },

    application: {
      modalTitle: "Request a vacation",
      reasonLabel: "Reason",
      reasonQuestion: "Why do you need a vacation?",
      durationLabel: "Duration",
      durationHint: "A number = days (e.g. 7). Add m for months (e.g. 1m).",
      notStaff: `${E.error} Vacations are for staff only.`,
      alreadyOnVacation: `${E.error} You already have a vacation or a request under review.`,
      reasonRequired: `${E.error} Give a reason.`,
      invalidDuration: `${E.error} Invalid duration. Enter days (e.g. \`7\`) or months (e.g. \`1m\`).`,
      roleNotConfigured: `${E.error} Vacations aren't fully set up yet. Contact an admin.`,
      channelNotConfigured: `${E.error} Vacations aren't fully set up yet. Contact an admin.`,
      channelUnavailable: `${E.error} The vacation requests channel is misconfigured. Contact an admin.`,
      submitted: (duration: string) => `${E.success} Your **${duration}** vacation request was sent for review.`,
    },

    request: {
      heading: `${E.system} **Vacation request**`,
      staff: (userId: string) => `**Staff:** <@${userId}> (\`${userId}\`)`,
      duration: (duration: string) => `**Duration:** ${duration}`,
      window: (startsAt: Date, endsAt: Date) => `**Period:** ${t(startsAt, "f")} → ${t(endsAt, "f")}`,
      reason: (reason: string) => `**Reason:** ${reason}`,
      statusPending: "**Status:** under review",
      statusApproved: (userId: string) => `**Status:** approved by <@${userId}>`,
      statusRejected: (userId: string) => `**Status:** rejected by <@${userId}>`,
      statusActive: (userId: string) => `**Status:** approved by <@${userId}>, active`,
      approveButton: "Approve",
      refuseButton: "Refuse",
      infoButton: "Info",
      notAuthorized: `${E.error} Only staff managers decide vacations.`,
      alreadyDecided: `${E.error} This request was already decided.`,
      gone: `${E.error} This request no longer exists.`,
      applicantGone: `${E.error} The applicant left the server.`,
      applicantNotStaff: `${E.error} The applicant is no longer staff.`,
      approvedAck: `${E.success} Approved; the vacation is active.`,
      rejectedAck: `${E.success} Vacation request refused.`,
      activationFailed: `${E.error} Couldn't apply the vacation roles; the request stays under review. Try again.`,
      refuseModalTitle: "Refuse vacation request",
      refuseReasonLabel: "Reason",
      refuseReasonRequired: `${E.error} Give a reason.`,
      infoTitle: `${E.locked} **Vacation request — details**`,
      infoLine: (label: string, value: string) => `**${label}:** ${value}`,
    },

    dm: {
      submitted: (duration: string) => `Your **${duration}** vacation request was sent and is under review.`,
      approved: (endsAt: Date) => `Your vacation was approved. It ends ${t(endsAt, "F")}.`,
      rejected: (reason: string) => `Your vacation request was refused. Reason: ${reason}`,
      completed: "Your vacation ended and your staff roles are back.",
      brokenByManager: "A staff manager ended your break early. Your staff roles are back.",
      startedByManager: (duration: string, endsAt: Date) => `A staff manager put you on a **${duration}** break in **${S}**. It ends ${t(endsAt, "F")}.`,
    },
  },
  {
    serverName: S,

    break: {
      usage: `${E.warning} الطريقة: \`!بريك @عضو <المدة>\` مثل \`5m\` \`3d\` \`1w\` \`1M\``,
      invalidDuration: `${E.error} مدة غير صحيحة. استخدم \`5m\` (دقائق) أو \`3d\` (أيام) أو \`1w\` (أسابيع) أو \`1M\` (شهور).`,
      reasonPlaceholder: "بريك من مانجر الطاقم",
      targetNotStaff: (mention: string) => `${E.error} ${mention} مو من الطاقم.`,
      targetNotInGuild: `${E.error} العضو مو موجود في السيرفر.`,
      alreadyOnVacation: (mention: string) => `${E.error} ${mention} عنده إجازة أو بريك مفتوح.`,
      roleNotConfigured: `${E.error} رتبة الإجازة غير مضبوطة (الداشبورد ← الرتب).`,
      roleMissing: `${E.error} رتبة الإجازة ما عادت موجودة. اضبطها من جديد.`,
      hierarchy: `${E.error} ما أقدر أدير رتبه. حط رتبتي فوق رتبته (ورتبة الإجازة).`,
      botMissingPermission: `${E.error} ناقصني صلاحية **Manage Roles**.`,
      discordFailed: `${E.error} ديسكورد رفض تغيير الرتبة وما تطبّق شيء. جرّب مرة ثانية.`,
      done: (mention: string, duration: string, endsAt: Date) => `${E.success} ${mention} في بريك لمدة **${duration}**، يرجع ${t(endsAt, "R")}.`,
    },

    unbreak: {
      usage: `${E.warning} الطريقة: \`!انهاء-بريك @عضو\``,
      notOnVacation: (mention: string) => `${E.error} ${mention} مو في إجازة أو بريك.`,
      targetNotInGuild: `${E.warning} العضو مو في السيرفر. انلغت الإجازة بس ما رجعت الرتب.`,
      done: (mention: string) => `${E.success} انتهى بريك ${mention} ورجعت رتبه.`,
      doneNoRestore: (mention: string) => `${E.warning} انتهى بريك ${mention}، وبعض الرتب المحفوظة ما عادت موجودة وتم تجاوزها.`,
    },

    panel: {
      setupDeployed: (channelId: string) => `${E.success} تم نشر لوحة الإجازات في <#${channelId}>.`,
      setupUpdated: (channelId: string) => `${E.success} تم تحديث لوحة الإجازات في <#${channelId}>.`,
      setupChannelInvalid: `${E.error} شغّله في روم نصي عادي.`,
    },

    application: {
      modalTitle: "طلب إجازة",
      reasonLabel: "السبب",
      reasonQuestion: "ليش تحتاج إجازة؟",
      durationLabel: "المدة",
      durationHint: "رقم = أيام (مثال: 7). أضف m للشهور (مثال: 1m).",
      notStaff: `${E.error} الإجازات للطاقم بس.`,
      alreadyOnVacation: `${E.error} عندك إجازة أو طلب قيد المراجعة.`,
      reasonRequired: `${E.error} اكتب السبب.`,
      invalidDuration: `${E.error} مدة غير صحيحة. أدخل أيام (مثال: \`7\`) أو شهور (مثال: \`1m\`).`,
      roleNotConfigured: `${E.error} نظام الإجازات غير مضبوط. كلّم الأدمن.`,
      channelNotConfigured: `${E.error} نظام الإجازات غير مضبوط. كلّم الأدمن.`,
      channelUnavailable: `${E.error} روم طلبات الإجازات فيه خطأ. كلّم الأدمن.`,
      submitted: (duration: string) => `${E.success} انرسل طلب إجازتك (**${duration}**) للمراجعة.`,
    },

    request: {
      heading: `${E.system} **طلب إجازة**`,
      staff: (userId: string) => `**الإداري:** <@${userId}> (\`${userId}\`)`,
      duration: (duration: string) => `**المدة:** ${duration}`,
      window: (startsAt: Date, endsAt: Date) => `**الفترة:** ${t(startsAt, "f")} ← ${t(endsAt, "f")}`,
      reason: (reason: string) => `**السبب:** ${reason}`,
      statusPending: "**الحالة:** قيد المراجعة",
      statusApproved: (userId: string) => `**الحالة:** وافق <@${userId}>`,
      statusRejected: (userId: string) => `**الحالة:** رفض <@${userId}>`,
      statusActive: (userId: string) => `**الحالة:** وافق <@${userId}>، فعّالة`,
      approveButton: "قبول",
      refuseButton: "رفض",
      infoButton: "معلومات",
      notAuthorized: `${E.error} الإجازات لمانجرات الطاقم بس.`,
      alreadyDecided: `${E.error} تم البت في الطلب.`,
      gone: `${E.error} الطلب ما عاد موجود.`,
      applicantGone: `${E.error} مقدّم الطلب طلع من السيرفر.`,
      applicantNotStaff: `${E.error} مقدّم الطلب ما عاد من الطاقم.`,
      approvedAck: `${E.success} تمت الموافقة، والإجازة فعّالة.`,
      rejectedAck: `${E.success} تم رفض الطلب.`,
      activationFailed: `${E.error} ما قدرت أطبّق رتب الإجازة، والطلب باقي قيد المراجعة. جرّب مرة ثانية.`,
      refuseModalTitle: "رفض طلب الإجازة",
      refuseReasonLabel: "السبب",
      refuseReasonRequired: `${E.error} اكتب السبب.`,
      infoTitle: `${E.locked} **طلب الإجازة — التفاصيل**`,
      infoLine: (label: string, value: string) => `**${label}:** ${value}`,
    },

    dm: {
      submitted: (duration: string) => `انرسل طلب إجازتك (**${duration}**) وهو قيد المراجعة.`,
      approved: (endsAt: Date) => `تمت الموافقة على إجازتك، تنتهي ${t(endsAt, "F")}.`,
      rejected: (reason: string) => `تم رفض طلب إجازتك. السبب: ${reason}`,
      completed: "انتهت إجازتك ورجعت رتبك الإدارية.",
      brokenByManager: "أنهى مانجر الطاقم بريكك بدري، ورجعت رتبك الإدارية.",
      startedByManager: (duration: string, endsAt: Date) => `حطّك مانجر الطاقم في بريك لمدة **${duration}** في **${S}**، ينتهي ${t(endsAt, "F")}.`,
    },
  },
);
