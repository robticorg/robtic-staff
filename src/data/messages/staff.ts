import { emojis } from "../emojis/index.ts";

const E = emojis;

/** `!check` only ever reports on staff below the OWNER boundary — say so on the card. */
const PROMOTION_SCOPE = "النطاق: الطاقم الاداري من العادي إلى الشيب (بدون الأدمن والمخفيين)";

export const staffMessages = {
  profile: {
    usage: `${E.warning} الطريقة: \`!staff-check @user\` أو \`!staff-check <id>\``,
    notStaff: (userId: string) => `${E.error} <@${userId}> ما له سجل في الطاقم الاداري.`,
    title: (userId: string) => `## معلومات الطاقم الاداري\n<@${userId}>`,
    status: (label: string) => `**الحالة:** ${label}`,
    level: (level: number, top: number) => `**ترتيب الرتبة:** المستوى ${level} من ${top}`,
    role: (roleId: string) => `**الرتبة:** <@&${roleId}>`,
    tier: (label: string) => `**التصنيف:** ${label}`,
    acceptedBy: (userId: string) => `**قبله في الطاقم الاداري:** <@${userId}>`,
    acceptedBySystem: "**قبله في الطاقم الاداري:** النظام",
    acceptedAt: (date: Date) => `**تاريخ القبول:** <t:${Math.floor(date.getTime() / 1000)}:D>`,
    staffFor: (duration: string) => `**مدة وجوده في الطاقم الاداري:** ${duration}`,
    lastPromotion: (date: Date, userId: string | null) =>
      `**آخر ترقية:** <t:${Math.floor(date.getTime() / 1000)}:R>${userId ? ` بواسطة <@${userId}>` : " بواسطة النظام"}`,
    noPromotion: "**آخر ترقية:** ما تمت ترقيته من يوم انقبل",
    unknown: "غير معروف",
    statuses: {
      ACTIVE: "نشط",
      BREAK: "في بريك",
      FIRED: "مفصول",
      BLACKLISTED: "بلاك ليست",
      TRANSFERRED: "منقول لحساب ثاني",
    } as Record<string, string>,
  },

  points: {
    reportClaimReason: (caseId: string) => `استلام البلاغ ${caseId}`,
    ticketClaimReason: (ticketId: string) => `استلام التكت ${ticketId}`,
  },

  promotionPoints: {
    eligible: "مؤهل للترقية",
    notEligible: "غير مؤهل للترقية",
    unknownMember: "عضو غير موجود في السيرفر",

    invalidPoints: `${E.error} لازم يكون عدد النقاط رقم صحيح موجب (1 فأكثر) — بدون كسور ولا أصفار ولا أرقام سالبة.`,
    configured: (points: number) =>
      `تم ضبط الحد الأدنى للترقية على **${points}** نقطة في الأسبوع.`,
    configuredNote:
      "هذا الحد للفحص بس — ما راح يرقّي أحد تلقائياً ولا يغيّر نقاط أو رتب أي عضو في الطاقم الاداري.",

    notConfigured: `${E.warning} ما تم ضبط نقاط الترقية بعد — استخدم \`/promote-points points:<رقم>\` أول.`,
    noStaff: `${E.warning} ما فيه أعضاء الطاقم الاداري نشطين يطلعون في الفحص.`,
    unknownTier: `${E.error} نوع غير معروف. استخدم: \`staff\` · \`high\` · \`owner\` · \`ship\``,

    scope: PROMOTION_SCOPE,
    header: (points: number) =>
      `## فحص نقاط الترقية\nالمطلوب: **${points}** نقطة خلال آخر 7 أيام\n${PROMOTION_SCOPE}`,
    headerPage: (points: number, page: number, pages: number) =>
      `## فحص نقاط الترقية (${page}/${pages})\nالمطلوب: **${points}** نقطة خلال آخر 7 أيام\n${PROMOTION_SCOPE}`,
    entry: (displayName: string, userId: string, weeklyPoints: number, decision: string) =>
      [
        `**اسم الاداري:** ${displayName}`,
        `**المنشن:** <@${userId}>`,
        `**نقاط آخر 7 أيام:** ${weeklyPoints}`,
        `**القرار:** ${decision}`,
      ].join("\n"),
  },

  authorization: {
    NOT_A_MANAGER: `${E.error} ما عندك صلاحية تستخدم أوامر إدارة الطاقم الاداري.`,
    NOT_A_MANAGER_DEMOTE: `${E.error} ما عندك صلاحية تستخدم أمر الديموت.`,

    SELF_PROMOTE: `${E.error} ما تقدر ترقي نفسك.`,
    SELF_DEMOTE: `${E.error} ما تقدر تنزل رتبتك بنفسك.`,
    SELF_ACCEPT: `${E.error} ما تقدر تقبل نفسك في الطاقم الاداري.`,
    SELF_FIRE: `${E.error} ما تقدر تفصل نفسك.`,

    TARGET_ABOVE_ACTOR: `${E.error} ما تقدر تتحكم باداري رتبته أعلى من رتبتك.`,
    TARGET_ABOVE_ACTOR_DEMOTE: `${E.error} ما تقدر تنزل اداري رتبته أعلى من رتبتك.`,
    LEVEL_ABOVE_ACTOR: `${E.error} ما عندك صلاحية ترقي هذا العضو لهذا المستوى.`,
    LEVEL_ABOVE_AUTHORITY: `${E.error} ما عندك صلاحية ترقي أحد لهذا المستوى.`,

    TARGET_IN_OWNER: `${E.error} ما عندك صلاحية تنزل اداري من رتبة الأونر أو أعلى.`,
    TARGET_IN_SHIP: `${E.error} ما عندك صلاحية تنزل اداري من رتبة الشيب.`,
    TARGET_IN_SHIP_MANAGE: `${E.error} ما عندك صلاحية تتحكم باداري من رتبة الشيب.`,
    LEVEL_IN_SHIP: `${E.error} ما تقدر ترقي أحد إلى مستويات الشيب.`,

    ACTOR_NOT_STAFF: `${E.error} لازم تكون عضو في الطاقم الاداري عنده رتبة مرقّمة عشان تدير الطاقم الاداري.`,
    HIERARCHY_INVALID: `${E.error} إعدادات سلّم الطاقم الاداري ناقصة أو غير صحيحة — صحّحها قبل إدارة الطاقم الاداري.`,
    BELOW_MIN_LEVEL: `${E.error} ما تقدر تنزل هذا الطاقم الاداري أكثر. إذا تبي تفصله استخدم \`!fire\`.`,

    SELF_WARN: `${E.error} ما تقدر تحذّر نفسك.`,
    NOT_A_DEMISSION_MANAGER: `${E.error} ما عندك صلاحية تتعامل مع طلبات الاستقالة.`,
    DEMISSION_TARGET_IN_OWNER: `${E.error} استقالة اداري من رتبة الأونر يتعامل معها مانجر الأونر بس.`,
    DEMISSION_TARGET_IN_SHIP: `${E.error} استقالة اداري الشيب تتعامل معها الإدارة بس.`,
    DEMISSION_TARGET_BELOW_OWNER: `${E.error} هذا العضو تحت رتبة الأونر.`,
    DEMISSION_TARGET_NOT_STAFF: `${E.error} هذا العضو ما عنده رتبة ادارية مرقّمة.`,
    NOT_A_WARN_MANAGER: `${E.error} ما عندك صلاحية تحذّر الطاقم الاداري.`,
    WARN_TARGET_IN_OWNER: `${E.error} تحذير اداري من رتبة الأونر لمانجر الأونر بس.`,
    WARN_TARGET_IN_SHIP: `${E.error} اداري الشيب ما يحذّرهم إلا الأدمن.`,
    WARN_TARGET_BELOW_OWNER: `${E.error} مانجر الأونر يحذّر اداري الأونر بس — هذا العضو تحت رتبة الأونر.`,
    WARN_TARGET_NOT_STAFF: `${E.error} هذا العضو ما عنده رتبة ادارية مرقّمة.`,

    NOT_A_TRANSFER_MANAGER: `${E.error} أمر التحويل للأدمن ومانجر التحويل بس.`,
    TRANSFER_SAME_MEMBER: `${E.error} ما تقدر تحوّل عضوية الطاقم الاداري لنفس العضو.`,
  },

  come: {
    usage: `${E.warning} الطريقة: \`!come @العضو السبب\``,
    reasonRequired: `${E.error} لازم تكتب سبب النداء.`,
    self: `${E.error} ما تقدر تنادي نفسك.`,
    bot: `${E.error} ما تقدر تنادي بوت.`,
    sent: (userMention: string) => `${E.success} تم إرسال النداء لـ ${userMention} في الخاص.`,
    dmFailed: (userMention: string) =>
      `${E.error} ما قدرت أرسل لـ ${userMention} — خاصه مغلق.`,

    dm: {
      body: (callerId: string, reason: string) =>
        `لقد تم ندائك بواسطة <@${callerId}> للحضور بسبب : ${reason}`,
      button: "الذهاب للرسالة",
    },
  },

  transfer: {
    usage: `${E.warning} الطريقة: \`!transfer @من @إلى\``,
    roleWriteFailed: `${E.error} فشلت عملية الرتب — تم التراجع عن التحويل وما تغيّر شيء في قاعدة البيانات.`,

    activeCases: (
      sourceMention: string,
      counts: { reports: number; tickets: number; appeals: number; giftClaims: number },
    ) =>
      [
        `${E.error} ${sourceMention} عنده شغل مفتوح لازم ينتهي أو ينتقل لغيره قبل التحويل:`,
        counts.tickets > 0 ? `• تكتات: ${counts.tickets}` : null,
        counts.reports > 0 ? `• بلاغات: ${counts.reports}` : null,
        counts.appeals > 0 ? `• استئنافات: ${counts.appeals}` : null,
        counts.giftClaims > 0 ? `• هدايا بانتظار التسليم: ${counts.giftClaims}` : null,
      ]
        .filter(Boolean)
        .join("\n"),

    problem: {
      NOT_AUTHORIZED: () => `${E.error} أمر التحويل للأدمن ومانجر التحويل بس.`,
      SAME_MEMBER: () => `${E.error} ما تقدر تحوّل عضوية الطاقم الاداري لنفس العضو.`,
      TARGET_IS_BOT: () => `${E.error} ما تقدر تحوّل عضوية الطاقم الاداري لبوت.`,

      SOURCE_NOT_STAFF: (source: string) => `${E.error} ${source} مو عضو في الطاقم الاداري.`,
      SOURCE_FIRED: (source: string) => `${E.error} ${source} مفصول من الطاقم الاداري.`,
      SOURCE_BLACKLISTED: (source: string) =>
        `${E.error} ${source} في البلاك ليست — ما ينحوّل، وما ينشال منه البلاك ليست بهذا الأمر.`,
      SOURCE_ON_BREAK: (source: string) =>
        `${E.error} ${source} على إجازة الآن. رجّعه من الإجازة أول (\`!unbreak\`) عشان ما تبقى نسخة رتبه محفوظة لشخص غلط.`,
      SOURCE_TRANSFERRED: (source: string) =>
        `${E.error} ${source} محوّل عضويته أصلاً لعضو ثاني.`,
      SOURCE_HAS_ACTIVE_CASES: (source: string) =>
        `${E.error} ${source} عنده شغل مفتوح لازم ينتهي قبل التحويل.`,

      TARGET_ALREADY_STAFF: (_source: string, target: string) =>
        `${E.error} ${target} عضو في الطاقم الاداري أصلاً — افصله أول أو اختر عضو ثاني. ما ندمج سجلّين اداري.`,
      TARGET_BLACKLISTED: (_source: string, target: string) =>
        `${E.error} ${target} في البلاك ليست.`,

      HIERARCHY_INVALID: () =>
        `${E.error} إعدادات سلّم الطاقم الاداري ناقصة أو غير صحيحة — صحّحها قبل التحويل.`,
      LADDER_NOT_CONFIGURED: () =>
        `${E.error} رتب الطاقم الاداري المرقّمة مو مضبوطة. شغّل \`/role set type:رتبة بداية الطاقم الاداري\` و \`/role set type:رتبة نهاية الطاقم الاداري\` أول.`,
      LEVEL_UNKNOWN: (source: string) =>
        `${E.error} ما قدرت أحدد مستوى ${source} في سلّم الطاقم الاداري.`,
    },

    success: (source: string, target: string, level: number) =>
      `${E.success} تم تحويل عضوية الطاقم الاداري من ${source} إلى ${target} — المستوى **${level}**.`,
    successWithType: (source: string, target: string, level: number, type: string) =>
      `${E.success} تم تحويل عضوية الطاقم الاداري من ${source} إلى ${target} — المستوى **${level}** ونوع **${type}**.`,
    rolesLine: (granted: number, removed: number) =>
      `تم إعطاء ${granted} رتبة وسحب ${removed} رتبة.`,
    skippedLine: (count: number) =>
      `${E.warning} ${count} رتبة ما انعطت — إما محذوفة أو فوق رتبة البوت.`,
    statsNote: "نقاط وإحصائيات العضو القديم تبقى في سجلّه ولا تنتقل.",
  },
} as const;
