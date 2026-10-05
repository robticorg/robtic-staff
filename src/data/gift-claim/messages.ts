import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";

const E = emojis;

export const giftClaimMessages = {
  serverName: branding.communityName,

  create: {
    alreadyClaimed: (status: string) =>
      `${E.warning} عندك طلب هدية مفتوح أصلاً (الحالة: ${status}). خلّص منه أول قبل ما تفتح طلب جديد.`,
    channelNotConfigured: `${E.error} نظام الهدايا مو مضبوط. اطلب من الأدمن يشغّل \`/channels set type:GIFT_CLAIMS\`.`,
    proofRequired: `${E.error} لازم ترفع صورة تثبت إنك فزت بالهدية.`,
    rewardRequired: `${E.error} لازم تكتب اسم الهدية.`,
    deliveryTypeRequired: `${E.error} لازم تختار نوع الجائزة.`,
    submittedAck: `${E.success} تم إرسال طلبك — مانجر الهدايا راح يراجعه ويردّ عليك بالخاص.`,
  },

  case: {
    rewardFallback: "غير محدد",
    heading: `${E.report} **طلب استلام هدية**`,
    user: (userId: string) => `**العضو:** <@${userId}> (\`${userId}\`)`,
    reward: (name: string) => `**المكافأة:** ${name}`,
    prize: (prize: string) => `**التفاصيل:** ${prize}`,
    claimId: (id: string) => `**آيدي الطلب:** \`${id}\``,
    requestedBy: (userId: string) => `**طلبه:** <@${userId}>`,
    ticket: (ticketId: string, channelId: string | null) =>
      channelId ? `**التكت:** \`${ticketId}\` — <#${channelId}>` : `**التكت:** \`${ticketId}\``,
    askedIn: (channelId: string) => `**مكان الطلب:** <#${channelId}>`,
    account: (account: string) => `**حساب العضو:** ${account}`,
    staffRequestHeading: `${E.report} **طلب هدية من الطاقم الاداري**`,
    statusLine: (status: string) => `**الحالة:** ${status}`,
    reviewedBy: (userId: string) => `**راجعه:** <@${userId}>`,
    fulfilledBy: (userId: string) => `**سلّمه:** <@${userId}>`,
    rejectionReason: (reason: string) => `**سبب الرفض:** ${reason}`,
    proofHeading: "**إثبات الفوز:**",
    noProofYet: "_ما تم رفع إثبات._",
    fulfillmentProofHeading: "**إثبات التسليم:**",
  },

  review: {
    notAuthorized: `${E.error} معالجة طلبات الهدايا لمانجرات الهدايا بس.`,
    claimGone: `${E.error} طلب الهدية هذا ما عاد موجود.`,
    alreadyDecided: `${E.error} تم البت في طلب الهدية هذا من قبل.`,
    notApproved: `${E.error} لازم يتوافق على الطلب قبل ما يتحدد كـ "تم التسليم".`,

    approvedAck: `${E.success} تمت الموافقة على الطلب. سلّم الهدية، وبعدها اضغط **تم التسليم**.`,
    rejectedAck: `${E.success} تم رفض الطلب.`,
    fulfilledAck: `${E.success} تم تحديد الطلب كـ "تم التسليم".`,

    rejectReasonRequired: `${E.error} لازم تكتب سبب للرفض.`,
    fulfillProofRequired: `${E.error} لازم ترفع صورة تثبت تسليم الهدية.`,
  },

  request: {
    rewardFallback: "جائزة من الطاقم الاداري",
    creditsReward: (amount: string) => `${amount} كريدت`,
    rejected: (userId: string, requestedBy: string | null, managerId: string, reason: string) =>
      `${E.error} تم رفض طلب الهدية لـ <@${userId}>${requestedBy ? ` (طلبه <@${requestedBy}>)` : ""} من <@${managerId}>.\n**السبب:** ${reason}`,
  },

  dm: {
    submitted: (reward: string) =>
      [
        "تم إرسال طلب استلام الهدية حقك.",
        "",
        `**الهدية:** ${reward}`,
        "**الحالة:** قيد المراجعة",
      ].join("\n"),
    approved:
      "تمت الموافقة على طلب الهدية حقك.\n\nمانجر الهدايا راح يسلّمك هديتك قريب.",
    rejected: (reason: string) =>
      ["تم رفض طلب الهدية حقك.", "", "**السبب:**", reason].join("\n"),
    fulfilled: "تم إكمال طلب الهدية حقك وتسليم هديتك. مرفق إثبات التسليم.",
  },
} as const;
