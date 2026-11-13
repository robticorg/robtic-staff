import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const rel = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;
type Labels = Record<string, string>;

export const GIFT_DELIVERY_TYPE_LABELS: Labels = bilingual<Labels>(
  { CREDITS: "Credits", LINK: "Nitro | Effect", OTHER: "Other" },
  { CREDITS: "كريدتس", LINK: "نيترو | إفكت", OTHER: "أخرى" },
);

export const GIFT_DELIVERY_STATUS_LABELS: Labels = bilingual<Labels>(
  { PENDING: "Waiting to deliver", PROCESSING: "Delivering", READY: "Waiting for the member to open it", CLAIMED: "Opened by the member", FULFILLED: "Delivered", FAILED: "Delivery failed" },
  { PENDING: "بانتظار التسليم", PROCESSING: "جاري التسليم", READY: "بانتظار العضو يفتحها", CLAIMED: "استلمها العضو", FULFILLED: "تم التسليم", FAILED: "فشل التسليم" },
);

export const giftDeliveryMessages = bilingual(
  {
    typeMenu: {
      title: "## Reward type",
      sectionTitle: "## 🎁 New reward",
      sectionTarget: (userId: string) => `For <@${userId}>`,
      sectionNote: (info: string) => `**Note:** ${info}`,
      selectPrompt: "Choose the reward type below.",
      selectPlaceholder: "Reward type",
      optionDescriptions: {
        CREDITS: "Automatic credits transfer",
        LINK: "Nitro or effect link sent to the member by DM",
        OTHER: "Delivered by hand with proof",
      } as Record<string, string>,
      claimHint: "Choose the reward type to continue.",
      commandHint: (userId: string, info: string | null) => (info ? `For <@${userId}>\n**Info:** ${info}` : `For <@${userId}>`),
    },

    requestModals: {
      creditsTitle: "Credits request",
      linkTitle: "Nitro | Effect request",
      otherTitle: "Other reward request",
      amountLabel: "Amount",
      amountPlaceholder: "e.g. 500k or 5m",
      linkItemLabel: "What exactly is the reward?",
      linkItemPlaceholder: "e.g. 1 month Nitro Boost",
      otherItemLabel: "What exactly is the reward?",
      otherItemPlaceholder: "e.g. 400 Robux",
      accountLabel: "Member's account (if needed)",
      accountPlaceholder: "e.g. their Roblox username",
      proofLabel: "Proof",
      proofDescription: "An image showing the member earned it.",
    },

    modals: {
      amountTitle: "Credits amount",
      amountLabel: "Amount",
      amountPlaceholder: "e.g. 500000, 500k or 50m",
      linkTitle: "Deliver reward",
      linkLabel: "Gift link",
      linkPlaceholder: "https://discord.gift/…",
      infoLabel: "Extra info",
      infoPlaceholder: "Account name, how to redeem, anything they need",
      proofTitle: "Deliver reward",
      proofLabel: "Proof",
      proofDescription: "Upload one image or file as proof.",
    },

    buttons: {
      deliver: "Deliver reward",
      retry: "Retry delivery",
      reveal: "Show reward",
    },

    errors: {
      amountInvalid: `${E.error} The amount must be a whole number above zero.`,
      linkInvalid: `${E.error} Invalid gift link. It must start with https://`,
      proofRequired: `${E.error} Upload one proof.`,
      proofTooMany: `${E.error} Upload only one proof.`,
      proofTooLarge: `${E.error} The proof file is too large. Shrink it and try again.`,
      proofDownloadFailed: `${E.error} Couldn't save the proof. Try again.`,
      deliveriesChannelMissing: `${E.error} The gift deliveries channel isn't set (dashboard → Channels).`,
      deliveryCategoryMissing: `${E.error} The gift delivery category isn't set and the member's DMs are closed.`,
      creditsDisabled: `${E.error} Automatic credits aren't enabled on the bot.`,
      autoclaimOff: `${E.error} Automatic credits are off. Turn them on with \`/autoclaim\` or pick another type.`,
      secretKeyMissing: `${E.error} Link delivery isn't enabled (encryption key missing).`,
      typeRequired: `${E.error} Choose a reward type.`,
      typeMismatch: `${E.error} This reward is a different type. Use the right deliver button.`,
      alreadyDelivered: `${E.warning} This reward was already delivered.`,
      inProgress: `${E.warning} Delivery is running. Wait for it to finish.`,
      notRetryable: `${E.error} There's no failed delivery to retry.`,
      notApproved: `${E.error} The request must be approved first.`,
      userGone: `${E.error} The member no longer exists.`,
      apiUnavailable: "The transfer service isn't responding",
      apiRejected: "The transfer service rejected the request",
      apiTimeout: "The transfer service timed out",
      apiUnconfirmed: "No transfer confirmation within 20 seconds",
      notOwner: "This reward isn't yours.",
      alreadyClaimed: "This reward was already used.",
      notAvailable: "This reward is no longer available.",
    },

    acks: {
      creditsDelivered: (amount: string) => `${E.success} **${amount}** credits sent.`,
      creditsFailed: (reason: string) => `${E.error} Transfer failed: ${reason}. The request stays approved; use **Retry delivery**.`,
      linkReadyDm: `${E.success} Reward sent to the member by DM.`,
      linkReadyChannel: (channelId: string) => `${E.success} Their DMs are closed, so the reward is ready in <#${channelId}>.`,
      otherDelivered: `${E.success} Reward delivered and proof saved.`,
      approvedPickDelivery: `${E.success} Approved. Press **Deliver reward** on the card when ready.`,
    },

    user: {
      linkReady: "Your reward is ready 🎁 Press the button below to see it.",
      linkReadyChannel: (userId: string) => `<@${userId}> Your DMs are closed, so your reward is here. Press the button below to see it.`,
      revealed: (link: string, info: string | null) => (info ? `🎁 **Your reward:**\n${link}\n\n**Info:**\n${info}` : `🎁 **Your reward:**\n${link}`),
      claimedState: `${E.success} Reward received.`,
      creditsDelivered: (amount: string) => `**${amount}** credits sent to your account 🎁`,
    },

    log: {
      creditsStarting: (userId: string, amount: string, claimId: string) => `${E.loading} Sending **${amount}** credits to <@${userId}> — \`${claimId}\``,
      creditsDone: (userId: string, amount: string, claimId: string) => `${E.success} Sent **${amount}** credits to <@${userId}> — \`${claimId}\``,
      creditsFailed: (userId: string, claimId: string, reason: string) => `${E.error} Credits to <@${userId}> failed — \`${claimId}\`. **Reason:** ${reason}`,
      linkReady: (userId: string, staffId: string, claimId: string, where: string) => `${E.success} Link reward ready for <@${userId}> by <@${staffId}> — \`${claimId}\` (${where})`,
      linkClaimed: (userId: string, claimId: string) => `${E.success} <@${userId}> opened their link reward — \`${claimId}\``,
      otherDelivered: (userId: string, staffId: string, claimId: string) => `${E.success} Reward delivered to <@${userId}> by <@${staffId}> — \`${claimId}\``,
      info: (info: string) => `**Info:** ${info}`,
      whereDm: "by DM",
      whereChannel: (channelId: string) => `in <#${channelId}>`,
    },

    autoclaim: {
      enabled: "Automatic credits turned on.",
      disabled: "Automatic credits turned off. No transfers until you turn them back on.",
      statusOn: "Automatic credits: **on**",
      statusOff: "Automatic credits: **off**",
      urlMissingNote: "-# Heads-up: AUTOCLAIM_API_URL isn't set, so transfers will fail until it is.",
    },

    card: {
      type: (label: string) => `**Type:** ${label}`,
      amount: (amount: string) => `**Amount:** ${amount}`,
      deliveryStatus: (label: string) => `**Delivery:** ${label}`,
      deliveryError: (reason: string) => `**Last error:** ${reason}`,
    },

    command: {
      usage: `${E.warning} Usage: \`!gift @user <reward>\`, or \`!gift <reward>\` inside a ticket`,
      onlyTicketOwner: `${E.error} Inside a ticket, only its owner can get the reward.`,
      ticketOwnerGone: `${E.error} The ticket owner left the server.`,
      requestSent: (userId: string, channelId: string) => `${E.success} Gift request for <@${userId}> sent to the admins in <#${channelId}>.`,
      notInTicket: `${E.error} Use this inside a ticket.`,
      notStaff: `${E.error} Staff only.`,
      notAuthor: `${E.error} This menu is for whoever ran the command.`,
      expired: `${E.warning} This menu expired. Run the command again.`,
      selfGift: `${E.error} You can't reward yourself.`,
      itemRequired: `${E.error} Write what the reward is.`,
      cooldown: (endsAt: Date) => `${E.warning} \`!gift\` works once every 30 minutes per ticket. Try again ${rel(endsAt)}.`,
      requestDone: (userId: string, channelId: string) => `${E.success} Gift request for <@${userId}> sent in <#${channelId}>, waiting for approval.`,
      rewardName: (info: string | null) => info ?? "A reward from staff",
    },

    send: {
      usage: `${E.warning} Usage: \`!send @user <amount> [gift]\`, e.g. \`!send @user 5m\` (here) or \`!send @user 5m gift\` (in the deliveries channel)`,
      rewardName: (amount: string) => `${amount} credits`,
    },
  },
  {
    typeMenu: {
      title: "## نوع الجائزة",
      sectionTitle: "## 🎁 جائزة جديدة",
      sectionTarget: (userId: string) => `الجائزة لـ <@${userId}>`,
      sectionNote: (info: string) => `**ملاحظة:** ${info}`,
      selectPrompt: "اختر نوع الجائزة من القائمة.",
      selectPlaceholder: "نوع الجائزة",
      optionDescriptions: {
        CREDITS: "تحويل كريدتس تلقائي",
        LINK: "رابط نيترو أو إفكت يوصل للعضو بالخاص",
        OTHER: "تسليم يدوي مع إثبات",
      } as Record<string, string>,
      claimHint: "اختر نوع الجائزة للمتابعة.",
      commandHint: (userId: string, info: string | null) => (info ? `الجائزة لـ <@${userId}>\n**المعلومات:** ${info}` : `الجائزة لـ <@${userId}>`),
    },

    requestModals: {
      creditsTitle: "طلب كريدتس",
      linkTitle: "طلب نيترو | إفكت",
      otherTitle: "طلب جائزة أخرى",
      amountLabel: "المبلغ",
      amountPlaceholder: "مثال: 500k أو 5m",
      linkItemLabel: "وش الجائزة بالضبط؟",
      linkItemPlaceholder: "مثال: نيترو بوست شهر",
      otherItemLabel: "وش الجائزة بالضبط؟",
      otherItemPlaceholder: "مثال: 400 Robux",
      accountLabel: "حساب العضو (إذا يحتاج)",
      accountPlaceholder: "مثال: يوزر روبلوكس",
      proofLabel: "الإثبات",
      proofDescription: "صورة تثبت إن العضو يستحقها.",
    },

    modals: {
      amountTitle: "مبلغ الكريدتس",
      amountLabel: "المبلغ",
      amountPlaceholder: "مثال: 500000 أو 500k أو 50m",
      linkTitle: "تسليم الجائزة",
      linkLabel: "رابط الهدية",
      linkPlaceholder: "https://discord.gift/…",
      infoLabel: "معلومات إضافية",
      infoPlaceholder: "اسم الحساب، طريقة الاستلام، أو أي تفاصيل",
      proofTitle: "تسليم الجائزة",
      proofLabel: "الإثبات",
      proofDescription: "ارفع صورة أو ملف واحد كإثبات.",
    },

    buttons: {
      deliver: "تسليم الجائزة",
      retry: "إعادة التسليم",
      reveal: "عرض الجائزة",
    },

    errors: {
      amountInvalid: `${E.error} المبلغ لازم رقم صحيح أكبر من صفر.`,
      linkInvalid: `${E.error} رابط غير صالح. لازم يبدأ بـ https://`,
      proofRequired: `${E.error} ارفع إثبات واحد.`,
      proofTooMany: `${E.error} إثبات واحد بس.`,
      proofTooLarge: `${E.error} ملف الإثبات كبير. صغّره وجرّب مرة ثانية.`,
      proofDownloadFailed: `${E.error} ما قدرت أحفظ الإثبات. جرّب مرة ثانية.`,
      deliveriesChannelMissing: `${E.error} روم تسليم الهدايا غير مضبوط (الداشبورد ← الرومات).`,
      deliveryCategoryMissing: `${E.error} كاتيقوري التسليم غير مضبوط وخاص العضو مقفل.`,
      creditsDisabled: `${E.error} التحويل التلقائي للكريدتس غير مفعّل على البوت.`,
      autoclaimOff: `${E.error} التحويل التلقائي مقفل. شغّله بـ \`/autoclaim\` أو اختر نوع ثاني.`,
      secretKeyMissing: `${E.error} تسليم الروابط غير مفعّل (مفتاح التشفير ناقص).`,
      typeRequired: `${E.error} اختر نوع الجائزة.`,
      typeMismatch: `${E.error} نوع الجائزة مختلف. استخدم زر التسليم الصحيح.`,
      alreadyDelivered: `${E.warning} الجائزة تسلّمت.`,
      inProgress: `${E.warning} التسليم شغّال، انتظر لين يخلص.`,
      notRetryable: `${E.error} ما فيه تسليم فاشل للإعادة.`,
      notApproved: `${E.error} لازم الموافقة على الطلب أول.`,
      userGone: `${E.error} العضو ما عاد موجود.`,
      apiUnavailable: "خدمة التحويل ما ترد",
      apiRejected: "خدمة التحويل رفضت الطلب",
      apiTimeout: "خدمة التحويل ما ردت بالوقت",
      apiUnconfirmed: "ما وصل تأكيد التحويل خلال 20 ثانية",
      notOwner: "هذي الجائزة مو لك.",
      alreadyClaimed: "الجائزة مستخدمة.",
      notAvailable: "الجائزة ما عادت متاحة.",
    },

    acks: {
      creditsDelivered: (amount: string) => `${E.success} تم تحويل **${amount}** كريدت.`,
      creditsFailed: (reason: string) => `${E.error} ما تم التحويل: ${reason}. الطلب باقي مقبول، استخدم **إعادة التسليم**.`,
      linkReadyDm: `${E.success} انرسلت الجائزة للعضو بالخاص.`,
      linkReadyChannel: (channelId: string) => `${E.success} خاص العضو مقفل، فالجائزة جاهزة في <#${channelId}>.`,
      otherDelivered: `${E.success} تم التسليم وحفظ الإثبات.`,
      approvedPickDelivery: `${E.success} تمت الموافقة. اضغط **تسليم الجائزة** على البطاقة.`,
    },

    user: {
      linkReady: "جائزتك جاهزة 🎁 اضغط الزر تحت لعرضها.",
      linkReadyChannel: (userId: string) => `<@${userId}> خاصك مقفل، فجائزتك هنا. اضغط الزر تحت لعرضها.`,
      revealed: (link: string, info: string | null) => (info ? `🎁 **جائزتك:**\n${link}\n\n**معلومات:**\n${info}` : `🎁 **جائزتك:**\n${link}`),
      claimedState: `${E.success} تم استلام الجائزة.`,
      creditsDelivered: (amount: string) => `تم تحويل **${amount}** كريدت لحسابك 🎁`,
    },

    log: {
      creditsStarting: (userId: string, amount: string, claimId: string) => `${E.loading} جاري تحويل **${amount}** كريدت إلى <@${userId}> — \`${claimId}\``,
      creditsDone: (userId: string, amount: string, claimId: string) => `${E.success} تم تحويل **${amount}** كريدت إلى <@${userId}> — \`${claimId}\``,
      creditsFailed: (userId: string, claimId: string, reason: string) => `${E.error} فشل تحويل الكريدت لـ <@${userId}> — \`${claimId}\`. **السبب:** ${reason}`,
      linkReady: (userId: string, staffId: string, claimId: string, where: string) => `${E.success} جائزة رابط جاهزة لـ <@${userId}> بواسطة <@${staffId}> — \`${claimId}\` (${where})`,
      linkClaimed: (userId: string, claimId: string) => `${E.success} <@${userId}> فتح جائزة الرابط — \`${claimId}\``,
      otherDelivered: (userId: string, staffId: string, claimId: string) => `${E.success} تم تسليم جائزة لـ <@${userId}> بواسطة <@${staffId}> — \`${claimId}\``,
      info: (info: string) => `**معلومات:** ${info}`,
      whereDm: "بالخاص",
      whereChannel: (channelId: string) => `في <#${channelId}>`,
    },

    autoclaim: {
      enabled: "تم تشغيل التحويل التلقائي للكريدتس.",
      disabled: "تم إيقاف التحويل التلقائي. ما فيه تحويلات لين تشغّله.",
      statusOn: "التحويل التلقائي: **شغّال**",
      statusOff: "التحويل التلقائي: **مقفل**",
      urlMissingNote: "-# تنبيه: AUTOCLAIM_API_URL غير مضبوط، فالتحويل بيفشل لين يتضبط.",
    },

    card: {
      type: (label: string) => `**النوع:** ${label}`,
      amount: (amount: string) => `**المبلغ:** ${amount}`,
      deliveryStatus: (label: string) => `**التسليم:** ${label}`,
      deliveryError: (reason: string) => `**آخر خطأ:** ${reason}`,
    },

    command: {
      usage: `${E.warning} الطريقة: \`!gift @user <الجائزة>\`، وداخل التكت: \`!gift <الجائزة>\``,
      onlyTicketOwner: `${E.error} داخل التكت الجائزة لصاحب التكت بس.`,
      ticketOwnerGone: `${E.error} صاحب التكت طلع من السيرفر.`,
      requestSent: (userId: string, channelId: string) => `${E.success} انرسل طلب هدية لـ <@${userId}> للإدارة في <#${channelId}>.`,
      notInTicket: `${E.error} داخل تكت بس.`,
      notStaff: `${E.error} للطاقم بس.`,
      notAuthor: `${E.error} القائمة لصاحب الأمر بس.`,
      expired: `${E.warning} انتهت القائمة. شغّل الأمر من جديد.`,
      selfGift: `${E.error} ما تقدر تعطي نفسك جائزة.`,
      itemRequired: `${E.error} اكتب وش الجائزة.`,
      cooldown: (endsAt: Date) => `${E.warning} \`!gift\` مرة كل 30 دقيقة لكل تكت. ترجع ${rel(endsAt)}.`,
      requestDone: (userId: string, channelId: string) => `${E.success} انرسل طلب الهدية لـ <@${userId}> في <#${channelId}>، بانتظار الموافقة.`,
      rewardName: (info: string | null) => info ?? "جائزة من الطاقم",
    },

    send: {
      usage: `${E.warning} الطريقة: \`!send @user <المبلغ> [gift]\` مثل \`!send @user 5m\` (هنا) أو \`!send @user 5m gift\` (في روم التسليم)`,
      rewardName: (amount: string) => `تحويل ${amount} كريدت`,
    },
  },
);
