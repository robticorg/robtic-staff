import { emojis } from "../emojis/index.ts";

const E = emojis;

export const staffMessages = {
  points: {
    reportClaimReason: (caseId: string) => `استلام البلاغ ${caseId}`,
    ticketClaimReason: (ticketId: string) => `استلام التكت ${ticketId}`,
  },

  authorization: {
    NOT_A_MANAGER: `${E.error} ما عندك صلاحية تستخدم أوامر إدارة الستاف.`,
    NOT_A_MANAGER_DEMOTE: `${E.error} ما عندك صلاحية تستخدم أمر الديموت.`,

    SELF_PROMOTE: `${E.error} ما تقدر ترقي نفسك.`,
    SELF_DEMOTE: `${E.error} ما تقدر تنزل رتبتك بنفسك.`,
    SELF_ACCEPT: `${E.error} ما تقدر تقبل نفسك في الستاف.`,
    SELF_FIRE: `${E.error} ما تقدر تفصل نفسك.`,

    TARGET_ABOVE_ACTOR: `${E.error} ما تقدر تتحكم بستاف رتبته أعلى من رتبتك.`,
    TARGET_ABOVE_ACTOR_DEMOTE: `${E.error} ما تقدر تنزل ستاف رتبته أعلى من رتبتك.`,
    LEVEL_ABOVE_ACTOR: `${E.error} ما عندك صلاحية ترقي هذا العضو لهذا المستوى.`,
    LEVEL_ABOVE_AUTHORITY: `${E.error} ما عندك صلاحية ترقي أحد لهذا المستوى.`,

    TARGET_IN_OWNER: `${E.error} ما عندك صلاحية تنزل ستاف من رتبة الأونر أو أعلى.`,
    TARGET_IN_SHIP: `${E.error} ما عندك صلاحية تنزل ستاف من رتبة الشيب.`,
    TARGET_IN_SHIP_MANAGE: `${E.error} ما عندك صلاحية تتحكم بستاف من رتبة الشيب.`,
    LEVEL_IN_SHIP: `${E.error} ما تقدر ترقي أحد إلى مستويات الشيب.`,

    ACTOR_NOT_STAFF: `${E.error} لازم تكون عضو ستاف عنده رتبة مرقّمة عشان تدير الستاف.`,
    HIERARCHY_INVALID: `${E.error} إعدادات سلّم الستاف ناقصة أو غير صحيحة — صحّحها قبل إدارة الستاف.`,
    BELOW_MIN_LEVEL: `${E.error} ما تقدر تنزل هذا الستاف أكثر. إذا تبي تفصله استخدم \`!fire\`.`,

    SELF_WARN: `${E.error} ما تقدر تحذّر نفسك.`,
    NOT_A_WARN_MANAGER: `${E.error} ما عندك صلاحية تحذّر الستاف.`,
    WARN_TARGET_IN_OWNER: `${E.error} تحذير ستاف من رتبة الأونر لمانجر الأونر بس.`,
    WARN_TARGET_IN_SHIP: `${E.error} ستاف الشيب ما يحذّرهم إلا الأدمن.`,
    WARN_TARGET_BELOW_OWNER: `${E.error} مانجر الأونر يحذّر ستاف الأونر بس — هذا العضو تحت رتبة الأونر.`,
    WARN_TARGET_NOT_STAFF: `${E.error} هذا العضو ما عنده رتبة ستاف مرقّمة.`,

    NOT_A_TRANSFER_MANAGER: `${E.error} أمر التحويل للأدمن ومانجر التحويل بس.`,
    TRANSFER_SAME_MEMBER: `${E.error} ما تقدر تحوّل عضوية الستاف لنفس العضو.`,
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
      SAME_MEMBER: () => `${E.error} ما تقدر تحوّل عضوية الستاف لنفس العضو.`,
      TARGET_IS_BOT: () => `${E.error} ما تقدر تحوّل عضوية الستاف لبوت.`,

      SOURCE_NOT_STAFF: (source: string) => `${E.error} ${source} مو عضو ستاف.`,
      SOURCE_FIRED: (source: string) => `${E.error} ${source} مفصول من الستاف.`,
      SOURCE_BLACKLISTED: (source: string) =>
        `${E.error} ${source} في البلاك ليست — ما ينحوّل، وما ينشال منه البلاك ليست بهذا الأمر.`,
      SOURCE_ON_BREAK: (source: string) =>
        `${E.error} ${source} على إجازة الآن. رجّعه من الإجازة أول (\`!unbreak\`) عشان ما تبقى نسخة رتبه محفوظة لشخص غلط.`,
      SOURCE_TRANSFERRED: (source: string) =>
        `${E.error} ${source} محوّل عضويته أصلاً لعضو ثاني.`,
      SOURCE_HAS_ACTIVE_CASES: (source: string) =>
        `${E.error} ${source} عنده شغل مفتوح لازم ينتهي قبل التحويل.`,

      TARGET_ALREADY_STAFF: (_source: string, target: string) =>
        `${E.error} ${target} عضو ستاف أصلاً — افصله أول أو اختر عضو ثاني. ما ندمج سجلّين ستاف.`,
      TARGET_BLACKLISTED: (_source: string, target: string) =>
        `${E.error} ${target} في البلاك ليست.`,

      HIERARCHY_INVALID: () =>
        `${E.error} إعدادات سلّم الستاف ناقصة أو غير صحيحة — صحّحها قبل التحويل.`,
      LADDER_NOT_CONFIGURED: () =>
        `${E.error} رتب الستاف المرقّمة مو مضبوطة. شغّل \`/role start\` و \`/role end\` أول.`,
      LEVEL_UNKNOWN: (source: string) =>
        `${E.error} ما قدرت أحدد مستوى ${source} في سلّم الستاف.`,
    },

    success: (source: string, target: string, level: number) =>
      `${E.success} تم تحويل عضوية الستاف من ${source} إلى ${target} — المستوى **${level}**.`,
    successWithType: (source: string, target: string, level: number, type: string) =>
      `${E.success} تم تحويل عضوية الستاف من ${source} إلى ${target} — المستوى **${level}** ونوع **${type}**.`,
    rolesLine: (granted: number, removed: number) =>
      `تم إعطاء ${granted} رتبة وسحب ${removed} رتبة.`,
    skippedLine: (count: number) =>
      `${E.warning} ${count} رتبة ما انعطت — إما محذوفة أو فوق رتبة البوت.`,
    statsNote: "نقاط وإحصائيات العضو القديم تبقى في سجلّه ولا تنتقل.",
  },
} as const;
