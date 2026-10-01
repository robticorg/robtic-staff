import { emojis } from "../emojis/index.ts";

const E = emojis;

export const statsMessages = {
  notStaff: `${E.error} عرض الإحصائيات للستاف بس.`,
  managerOnlyOthers: `${E.error} عرض إحصائيات عضو ثاني لمانجرات الستاف بس.`,
  noStaffRecord: (mention: string) => `${E.error} ${mention} ما له سجل ستاف في هذا السيرفر.`,
  leaderboardEmpty: "ما فيه ستاف مصنّف لهذه الفترة.",

  usageStats: `${E.warning} الطريقة: \`!احصائياتي [@عضو]\``,
  usageLeaderboard: `${E.warning} الطريقة: \`!المتصدرين [daily|weekly|monthly|all]\``,
  usagePoints: `${E.warning} الطريقة: \`!نقاطي [@عضو]\``,

  points: {
    heading: (userId: string) => `## نقاط <@${userId}>`,
    allTime: (n: number) => `**إجمالي النقاط:** ${n}`,
    weekly: (n: number) => `**نقاط الأسبوع:** ${n}`,
    breakdownRow: (label: string, n: number) => `${label}: **${n}**`,
    breakdownEmpty: "ما فيه نقاط هذا الأسبوع.",
  },

  pointTypeLabels: {
    TICKET_CLAIM: "نقاط التكتات",
    REPORT_CLAIM: "نقاط البلاغات",
    GIFT_CLAIM: "نقاط الهدايا",
    USER_WARNING: "نقاط تحذيرات الأعضاء",
    STAFF_WARNING: "نقاط تحذيرات الستاف",
    MESSAGE: "نقاط الرسائل",
    JAIL: "نقاط السجن",
    STAFF_ACCEPT: "نقاط قبول الستاف",
    APPEAL_SUCCESS_PENALTY: "خصم استئناف مقبول",
    MANUAL_ADJUSTMENT: "تعديل يدوي",
    OTHER: "نقاط أخرى",
  } as Record<string, string>,

  header: "**إحصائيات الستاف**",
  divider: "━━━━━━━━━━━━━━",
  line: (label: string, value: string | number) => `${label}: ${value}`,

  memberLine: (userId: string) => `<@${userId}>`,
  roleLine: (roleId: string | null, level: number) =>
    roleId ? `الرتبة: <@&${roleId}>` : `الرتبة: المستوى ${level}`,
  statusLine: (status: string) => `الحالة: ${status}`,

  pointsHeading: "__النقاط__",
  pointRow: (label: string, value: number) => `${label}: **${value}**`,

  activityHeading: (periodLabel: string) => `__النشاط — ${periodLabel}__`,
  activityRow: (label: string, value: string | number) => `${label}: ${value}`,

  reset: {
    one: (mention: string, previous: number) =>
      `تم تصفير عدّادات تكتات ${mention} (كانت ${previous}).`,
    nothingToDo: (mention: string) => `عدّادات تكتات ${mention} مصفّرة أصلاً.`,
    all: (resetCount: number, totalStaff: number) =>
      `تم تصفير عدّادات التكتات لـ ${resetCount} من ${totalStaff} عضو ستاف.`,
    note: "سجلّ التكتات في قاعدة البيانات ما تغيّر — العدّادات بس رجعت صفر.",
  },

  ticketsByPanelHeading: "__التكتات حسب القسم__",
  ticketsByPanelEmpty: "• (ما فيه)",
  ticketsByPanelRow: (
    panelName: string,
    stat: { claimed: number; completed: number; open: number },
  ) =>
    `• ${panelName} — استلم **${stat.claimed}** · أكمل **${stat.completed}** · مفتوح **${stat.open}**`,

  recentHeading: "__آخر النشاطات__",
  recentRow: (rel: string, text: string) => `• ${rel} — ${text}`,
  recentEmpty: "• (ما فيه)",

  historyHeading: "__حركات النقاط__",
  historyRow: (rel: string, amount: number, type: string, ref: string) =>
    `• ${rel} — ${amount >= 0 ? "+" : ""}${amount} ${type}${ref ? ` (${ref})` : ""}`,

  lbHeader: (periodLabel: string) => `## متصدّري النقاط — ${periodLabel}`,
  lbRow: (rankText: string, userId: string, points: number) =>
    `${rankText} <@${userId}> — **${points}** نقطة`,
  lbMedal: (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`),

  admin: {
    notStaff: (mention: string) => `${E.error} ${mention} مو عضو ستاف في هذا السيرفر.`,
    defaultReason: (adminId: string) => `تعديل يدوي من <@${adminId}>`,
    added: (mention: string, amount: number, balance: number) =>
      `${E.success} تمت إضافة **${amount}** نقطة لـ ${mention}. الرصيد الحالي: **${balance}**.`,
    removed: (mention: string, amount: number, balance: number) =>
      `${E.success} تم خصم **${amount}** نقطة من ${mention}. الرصيد الحالي: **${balance}**.`,
    resetOne: (mention: string, previousBalance: number) =>
      `${E.success} تم تصفير نقاط ${mention} (كان عنده **${previousBalance}** نقطة).`,
    resetNothingToDo: (mention: string) => `${E.warning} ${mention} أصلاً عنده **0** نقطة.`,
    resetAll: (resetCount: number, totalStaff: number) =>
      `${E.success} تم تصفير نقاط **${resetCount}** من أصل **${totalStaff}** عضو ستاف.`,
  },

  card: {
    title: (userId: string) => `## احصائيات <@${userId}>`,
    tier: (label: string) => `**الرتبة:** ${label}`,
    staffType: (label: string) => `**النوع:** ${label}`,
    levelRole: (roleId: string | null, level: number) =>
      roleId
        ? `**رتبة المستوى:** <@&${roleId}> (المستوى ${level})`
        : `**رتبة المستوى:** المستوى ${level}`,
    lastRoleBeforeFire: (roleId: string | null, level: number) =>
      roleId
        ? `**آخر رتبة قبل الطرد:** <@&${roleId}> (المستوى ${level})`
        : `**آخر رتبة قبل الطرد:** المستوى ${level}`,
    acceptedBy: (userId: string | null) => `**قبله:** ${userId ? `<@${userId}>` : "النظام"}`,
    acceptedAt: (at: Date) => `**تاريخ القبول:** <t:${Math.floor(at.getTime() / 1000)}:D>`,
    firedBy: (userId: string | null, at: Date | null) =>
      `**طرده:** ${userId ? `<@${userId}>` : "النظام"}${at ? ` — <t:${Math.floor(at.getTime() / 1000)}:D>` : ""}`,
    resignationApprovedBy: (userId: string | null, at: Date | null) =>
      `**وافق على استقالته:** ${userId ? `<@${userId}>` : "النظام"}${at ? ` — <t:${Math.floor(at.getTime() / 1000)}:D>` : ""}`,
    resignationReason: (reason: string) => `**سبب الاستقالة:** ${reason}`,
    lastRoleBeforeLeaving: (roleId: string | null, level: number) =>
      roleId
        ? `**آخر رتبة قبل الاستقالة:** <@&${roleId}> (المستوى ${level})`
        : `**آخر رتبة قبل الاستقالة:** المستوى ${level}`,
    exitStatuses: {
      FIRED: "مطرود",
      DEMISSION: "مستقيل",
      BLACKLISTED: "مطرود (بلاك ليست)",
    } as Record<string, string>,

    menu: {
      placeholder: "اختر اللي تبي تشوفه",
      options: {
        home: { label: "الملف الشخصي", description: "الرتبة والحالة ومن قبله وإجمالي النقاط" },
        weeks: { label: "النقاط الأسبوعية", description: "نقاطه في كل أسبوع من أول ما انضم" },
        acts: { label: "إحصائيات الأعمال", description: "البلاغات والقبول والطرد والتحذيرات والسجن" },
        tix: { label: "إحصائيات التكتات", description: "التكتات المستلمة والمكتملة لكل قسم" },
        recent: { label: "آخر النشاطات", description: "آخر 10 أشياء سواها" },
        app: { label: "طلب التقديم", description: "بياناته لما قدّم: العمر والمدينة والقسم والنتيجة" },
      } as Record<string, { label: string; description: string }>,
    },

    application: {
      heading: (userId: string) => `## طلب التقديم — <@${userId}>`,
      none: "ما لقيت له أي طلب تقديم محفوظ.",
      more: (n: number) => `-# عنده ${n} طلبات — هذا آخرها.`,
      type: (label: string) => `**النوع:** ${label}`,
      status: (label: string) => `**الحالة:** ${label}`,
      submittedAt: (at: Date) => `**تاريخ التقديم:** <t:${Math.floor(at.getTime() / 1000)}:f>`,
      name: (v: string) => `**الاسم:** ${v}`,
      age: (v: number) => `**العمر:** ${v}`,
      city: (v: string) => `**المدينة:** ${v}`,
      gender: (v: string) => `**الجنس:** ${v}`,
      department: (v: string) => `**القسم:** ${v}`,
      joinedServer: (at: Date) => `**دخل السيرفر:** <t:${Math.floor(at.getTime() / 1000)}:D>`,
      recruiter: (id: string) => `**جابه:** <@${id}>`,
      girlVerified: (by: string | null) => `**توثيق البنات:** تم${by ? ` بواسطة <@${by}>` : ""}`,
      girlPending: "**توثيق البنات:** بانتظار التوثيق",
      acceptedBy: (by: string, at: Date | null, level: number | null) =>
        `**قبله:** <@${by}>${at ? ` — <t:${Math.floor(at.getTime() / 1000)}:D>` : ""}${level !== null ? ` (المستوى ${level})` : ""}`,
      rejectedBy: (by: string, at: Date | null) =>
        `**رفضه:** <@${by}>${at ? ` — <t:${Math.floor(at.getTime() / 1000)}:D>` : ""}`,
      rejectionReason: (v: string) => `**سبب الرفض:** ${v}`,
      transferHeading: "### بيانات النقل",
      transferServer: (name: string | null, members: number, online: number) =>
        `**السيرفر:** ${name ?? "—"} · ${members} عضو · ${online} متصل`,
      transferRole: (order: number, name: string | null) => `**رتبته هناك:** ${name ?? "—"} (ترتيب ${order})`,
      transferEligible: (eligible: boolean) => `**مؤهل للنقل:** ${eligible ? "نعم" : "لا"}`,
      transferProposed: (level: number | null) => `**المستوى المقترح:** ${level ?? "—"}`,
      transferEvidence: (n: number) => `**الإثباتات المرفوعة:** ${n}`,
      statuses: {
        PENDING: "بانتظار الاستلام",
        CLAIMED: "مستلم",
        UNDER_REVIEW: "قيد المراجعة",
        ACCEPTED: "مقبول",
        REJECTED: "مرفوض",
        CLOSED: "مقفل بدون قرار",
      } as Record<string, string>,
    },
    status: (label: string) => `**الحالة:** ${label}`,
    totalPoints: (n: number) => `**إجمالي النقاط:** ${n}`,
    breakPoints: (n: number) => `**نقاط البريك:** ${n} (ما تنحسب مع الإجمالي)`,

    statuses: {
      ACTIVE: "اداري",
      BREAK: "اداري (في بريك)",
      FIRED: "مطرود",
      BLACKLISTED: "مطرود (بلاك ليست)",
      TRANSFERRED: "منقول",
    } as Record<string, string>,

    buttons: {
      weeks: "النقاط الأسبوعية",
      actions: "إحصائيات الأعمال",
      tickets: "إحصائيات التكتات",
      recent: "آخر النشاطات",
      back: "رجوع",
      prev: "السابق",
      next: "التالي",
    },

    weeks: {
      heading: (userId: string) => `## النقاط الأسبوعية — <@${userId}>`,
      page: (page: number, pages: number) => `-# صفحة ${page} من ${pages}`,
      week: (index: number, start: Date, end: Date, total: number) =>
        `### الأسبوع ${index} — **${total}** نقطة\n-# <t:${Math.floor(start.getTime() / 1000)}:D> ← <t:${Math.floor(end.getTime() / 1000)}:D>`,
      empty: "ما فيه نقاط في هذا الأسبوع.",
      none: "ما عنده أي نقاط مسجّلة.",
    },

    actions: {
      heading: (userId: string) => `## إحصائيات الأعمال — <@${userId}>`,
      reportsGroup: "__البلاغات__",
      staffGroup: "__إدارة الستاف__",
      punishGroup: "__العقوبات والتحذيرات__",
      otherGroup: "__أخرى__",
      staffAccepted: "الستاف اللي قبلهم",
      applicationsRefused: "التقديمات اللي رفضها",
      staffFired: "الستاف اللي طردهم",
      staffPromoted: "الترقيات",
      staffDemoted: "التنزيلات",
      girlsVerified: "البنات اللي وثّقهن",
      jails: "السجن",
      vacationsDecided: "الإجازات اللي قرّرها",
    },

    tickets: {
      heading: (userId: string) => `## إحصائيات التكتات — <@${userId}>`,
      totals: (claimed: number, completed: number, open: number) =>
        `استلم **${claimed}** · أكمل **${completed}** · مفتوح حالياً **${open}**`,
      panel: (name: string) => `### ${name}`,
      panelRow: (stat: { claimed: number; completed: number; open: number }) =>
        `استلم **${stat.claimed}** · أكمل **${stat.completed}** · مفتوح **${stat.open}**`,
      empty: "ما استلم أي تكت.",
    },

    recent: {
      heading: (userId: string) => `## آخر النشاطات — <@${userId}>`,
    },

    notYours: `${E.error} هذي الأزرار لصاحب الأمر بس — اكتب \`!stats\` بنفسك.`,
  },

  labels: {
    memberFallback: "هذا العضو",
    today: "اليوم",
    week: "هذا الأسبوع",
    month: "هذا الشهر",
    allTime: "الكل",
    reportsClaimed: "البلاغات المستلمة",
    reportsCompleted: "البلاغات المكتملة",
    reportsAssignedNow: "البلاغات المسندة حالياً",
    ticketsClaimed: "التكتات المستلمة",
    ticketsCompleted: "التكتات المكتملة",
    ticketsAssignedNow: "التكتات المسندة حالياً",
    giftClaimsHandled: "طلبات الهدايا المعالجة",
    giftClaimsBreakdown: "طلبات الهدايا (موافقة / رفض / تسليم / طلب إضافي)",
    userWarningsIssued: "تحذيرات الأعضاء الصادرة",
    staffWarningsIssued: "تحذيرات الستاف الصادرة",
    warningsRevoked: "التحذيرات الملغاة",
    appealsHandled: "الاستئنافات المعالجة",
    appealsSuccessful: "الاستئنافات المقبولة",
    vacationsDecided: "الإجازات (موافقة / رفض)",
    totalActivity: "إجمالي النشاط",
  },
} as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  REPORT_CLAIM: "استلم بلاغ",
  REPORT_COMPLETE: "أنهى بلاغ",
  TICKET_CLAIM: "استلم تكت",
  TICKET_COMPLETE: "أنهى تكت",
  GIFT_CLAIM: "عالج طلب هدية",
  GIFT_CLAIM_APPROVE: "وافق على طلب هدية",
  GIFT_CLAIM_REJECT: "رفض طلب هدية",
  GIFT_CLAIM_RE_REQUEST: "طلب إثبات إضافي لهدية",
  GIFT_CLAIM_FULFILL: "سلّم طلب هدية",
  GIFT_CLAIM_REVIEW: "راجع طلب هدية",
  USER_WARNING: "أصدر تحذير لعضو",
  STAFF_WARNING: "أصدر تحذير ستاف",
  PROMOTE: "رقّى عضو ستاف",
  DEMOTE: "نزّل عضو ستاف",
  ACCEPT: "قبل عضو ستاف",
  FIRE: "فصل عضو ستاف",
  PUNISHMENT_REQUEST: "طلب عقوبة",
  PUNISHMENT_APPROVED: "وافق على عقوبة",
  PUNISHMENT_REJECTED: "رفض عقوبة",
  PUNISHMENT_EXECUTED: "نفّذ عقوبة",
  PUNISHMENT_REVOKED: "ألغى عقوبة",
  VACATION_REQUEST: "طلب إجازة",
  VACATION_APPROVED: "وافق على إجازة",
  VACATION_REJECTED: "رفض إجازة",
  BREAK: "دخل بريك",
  RETURN_FROM_BREAK: "رجع من البريك",
  APPEAL_CLAIM: "استلم استئناف",
  APPEAL_ACCEPTED: "قبل استئناف",
  APPEAL_REJECTED: "رفض استئناف",
  GIRL_VERIFY: "وثّق بنت",
  OTHER: "نشاط",
};
