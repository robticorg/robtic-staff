import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const giftClaimMessages = bilingual(
  {
    serverName: branding.communityName,

    create: {
      alreadyClaimed: (status: string) => `${E.warning} You already have a gift request open (${status}). Finish it first.`,
      channelNotConfigured: `${E.error} Gift claims aren't set up. Ask an admin to set the channel on the dashboard.`,
      proofRequired: `${E.error} Upload an image proving you won.`,
      rewardRequired: `${E.error} Write the gift's name.`,
      deliveryTypeRequired: `${E.error} Choose the reward type.`,
      submittedAck: `${E.success} Request sent. The gift manager will review it and reply by DM.`,
    },

    case: {
      rewardFallback: "Not specified",
      heading: `${E.report} **Gift claim**`,
      user: (userId: string) => `**Member:** <@${userId}> (\`${userId}\`)`,
      reward: (name: string) => `**Reward:** ${name}`,
      prize: (prize: string) => `**Details:** ${prize}`,
      claimId: (id: string) => `**Request ID:** \`${id}\``,
      requestedBy: (userId: string) => `**Requested by:** <@${userId}>`,
      ticket: (ticketId: string, channelId: string | null) => (channelId ? `**Ticket:** \`${ticketId}\` — <#${channelId}>` : `**Ticket:** \`${ticketId}\``),
      askedIn: (channelId: string) => `**Asked in:** <#${channelId}>`,
      account: (account: string) => `**Member's account:** ${account}`,
      staffRequestHeading: `${E.report} **Gift request from staff**`,
      statusLine: (status: string) => `**Status:** ${status}`,
      reviewedBy: (userId: string) => `**Reviewed by:** <@${userId}>`,
      fulfilledBy: (userId: string) => `**Delivered by:** <@${userId}>`,
      rejectionReason: (reason: string) => `**Rejection reason:** ${reason}`,
      proofHeading: "**Proof of winning:**",
      noProofYet: "_No proof uploaded._",
      fulfillmentProofHeading: "**Proof of delivery:**",
    },

    review: {
      notAuthorized: `${E.error} Only gift managers handle gift claims.`,
      claimGone: `${E.error} This request no longer exists.`,
      alreadyDecided: `${E.error} Already decided.`,
      notApproved: `${E.error} Approve the request before marking it delivered.`,
      approvedAck: `${E.success} Approved. Deliver the gift, then press **Delivered**.`,
      rejectedAck: `${E.success} Request rejected.`,
      fulfilledAck: `${E.success} Marked as delivered.`,
      rejectReasonRequired: `${E.error} Give a reason.`,
      fulfillProofRequired: `${E.error} Upload an image proving delivery.`,
    },

    request: {
      rewardFallback: "A reward from staff",
      creditsReward: (amount: string) => `${amount} credits`,
      rejected: (userId: string, requestedBy: string | null, managerId: string, reason: string) =>
        `${E.error} Gift request for <@${userId}>${requestedBy ? ` (by <@${requestedBy}>)` : ""} rejected by <@${managerId}>. **Reason:** ${reason}`,
    },

    dm: {
      submitted: (reward: string) => `Your gift claim (**${reward}**) was sent and is under review.`,
      approved: "Your gift claim was approved. The gift manager will deliver it soon.",
      rejected: (reason: string) => `Your gift claim was rejected. Reason: ${reason}`,
      fulfilled: "Your gift was delivered. Proof of delivery is attached.",
    },
  },
  {
    serverName: branding.communityName,

    create: {
      alreadyClaimed: (status: string) => `${E.warning} عندك طلب هدية مفتوح (${status}). خلّصه أول.`,
      channelNotConfigured: `${E.error} نظام الهدايا غير مضبوط. اطلب من الأدمن يضبط الروم من الداشبورد.`,
      proofRequired: `${E.error} ارفع صورة تثبت فوزك.`,
      rewardRequired: `${E.error} اكتب اسم الهدية.`,
      deliveryTypeRequired: `${E.error} اختر نوع الجائزة.`,
      submittedAck: `${E.success} انرسل طلبك. مانجر الهدايا بيراجعه ويرد عليك بالخاص.`,
    },

    case: {
      rewardFallback: "غير محدد",
      heading: `${E.report} **طلب استلام هدية**`,
      user: (userId: string) => `**العضو:** <@${userId}> (\`${userId}\`)`,
      reward: (name: string) => `**المكافأة:** ${name}`,
      prize: (prize: string) => `**التفاصيل:** ${prize}`,
      claimId: (id: string) => `**آيدي الطلب:** \`${id}\``,
      requestedBy: (userId: string) => `**طلبه:** <@${userId}>`,
      ticket: (ticketId: string, channelId: string | null) => (channelId ? `**التكت:** \`${ticketId}\` — <#${channelId}>` : `**التكت:** \`${ticketId}\``),
      askedIn: (channelId: string) => `**مكان الطلب:** <#${channelId}>`,
      account: (account: string) => `**حساب العضو:** ${account}`,
      staffRequestHeading: `${E.report} **طلب هدية من الطاقم**`,
      statusLine: (status: string) => `**الحالة:** ${status}`,
      reviewedBy: (userId: string) => `**راجعه:** <@${userId}>`,
      fulfilledBy: (userId: string) => `**سلّمه:** <@${userId}>`,
      rejectionReason: (reason: string) => `**سبب الرفض:** ${reason}`,
      proofHeading: "**إثبات الفوز:**",
      noProofYet: "_ما فيه إثبات._",
      fulfillmentProofHeading: "**إثبات التسليم:**",
    },

    review: {
      notAuthorized: `${E.error} طلبات الهدايا لمانجرات الهدايا بس.`,
      claimGone: `${E.error} الطلب ما عاد موجود.`,
      alreadyDecided: `${E.error} تم البت فيه.`,
      notApproved: `${E.error} وافق على الطلب قبل تحديده كـ "تم التسليم".`,
      approvedAck: `${E.success} تمت الموافقة. سلّم الهدية ثم اضغط **تم التسليم**.`,
      rejectedAck: `${E.success} تم رفض الطلب.`,
      fulfilledAck: `${E.success} تم تحديده كـ "تم التسليم".`,
      rejectReasonRequired: `${E.error} اكتب السبب.`,
      fulfillProofRequired: `${E.error} ارفع صورة تثبت التسليم.`,
    },

    request: {
      rewardFallback: "جائزة من الطاقم",
      creditsReward: (amount: string) => `${amount} كريدت`,
      rejected: (userId: string, requestedBy: string | null, managerId: string, reason: string) =>
        `${E.error} رفض <@${managerId}> طلب الهدية لـ <@${userId}>${requestedBy ? ` (طلبه <@${requestedBy}>)` : ""}. **السبب:** ${reason}`,
    },

    dm: {
      submitted: (reward: string) => `انرسل طلب هديتك (**${reward}**) وهو قيد المراجعة.`,
      approved: "تمت الموافقة على طلب هديتك، وبيسلّمك مانجر الهدايا قريب.",
      rejected: (reason: string) => `تم رفض طلب هديتك. السبب: ${reason}`,
      fulfilled: "تم تسليم هديتك، ومرفق إثبات التسليم.",
    },
  },
);
