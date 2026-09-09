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

  ticketsByPanel: (entries: [string, number][]) =>
    entries.length
      ? `التكتات حسب القسم: ${entries.map(([p, n]) => `${p} ${n}`).join(" · ")}`
      : "التكتات حسب القسم: —",

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
  OTHER: "نشاط",
};
