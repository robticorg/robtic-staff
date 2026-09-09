import { emojis } from "../emojis/index.ts";

const E = emojis;

const WARNING_ORDINALS: Record<number, string> = {
  1: "التحذير الأول",
  2: "التحذير الثاني",
  3: "التحذير الثالث",
};

function ordinalWarning(level: number): string {
  return WARNING_ORDINALS[level] ?? `التحذير ${level}`;
}

export const prefixMessages = {
  common: {
    guildOnly: `${E.error} أوامر البريفكس تشتغل داخل السيرفر بس.`,
    genericError: `${E.error} صار خطأ وأنا أنفذ الأمر.`,
    notStaff: `${E.error} ما عندك صلاحية تستخدم هذا.`,
    notStaffManager: `${E.error} هذا لمانجرات الستاف بس.`,
    usage: (usage: string) => `${E.warning} الطريقة: \`${usage}\``,
    needUserTarget: `${E.warning} منشن العضو أو حط الآيدي حقه.`,
  },

  ticket: {
    notATicket: `${E.error} هذا الأمر يشتغل داخل روم التكت بس.`,
    ticketClosed: `${E.error} هذا التكت مغلق.`,
    claimed: (ticketId: string) => `${E.success} استلمت \`${ticketId}\`. **+1 نقطة.**`,
    claimedNoPoint: (ticketId: string) => `${E.success} أنت الحين مسؤول عن \`${ticketId}\`.`,
    closed: (ticketId: string) => `${E.success} تم إغلاق \`${ticketId}\`.`,
    closedWithTranscript: (ticketId: string, transcriptId: string) =>
      `${E.success} تم إغلاق \`${ticketId}\` — تم حفظ النسخة \`${transcriptId}\`.`,
    willBeDeleted: `${E.warning} راح ينحذف هذا التكت بعد شوي.`,
    deleted: (ticketId: string) => `${E.success} تم حذف \`${ticketId}\` (السجل محفوظ).`,
    renamed: (name: string) => `${E.success} تم تغيير اسم التكت إلى \`${name}\`.`,
    renameUsage: `${E.warning} الطريقة: \`!تغيير-الاسم <الاسم-الجديد>\``,
    transcriptSaved: (transcriptId: string) =>
      `${E.success} تم حفظ النسخة: \`${transcriptId}\`.`,
    addUsage: `${E.warning} الطريقة: \`!اضافة <@عضو|@رتبة> …\``,
    removeUsage: `${E.warning} الطريقة: \`!ازالة <@عضو|@رتبة> …\``,
    nothingToAdd: `${E.warning} منشن عضو أو رتبة واحدة على الأقل عشان تضيفهم.`,
    nothingToRemove: `${E.warning} منشن عضو أو رتبة واحدة على الأقل عشان تشيلهم.`,
    added: (users: number, roles: number) =>
      `${E.success} تمت إضافة ${users} عضو و ${roles} رتبة.`,
    removed: (count: number, skipped: number) =>
      skipped > 0
        ? `${E.success} تم حذف ${count}. ${E.warning} تم تجاوز ${skipped} عنصر محمي (صاحب التكت / المستلم / رتبة الدعم).`
        : `${E.success} تم حذف ${count} عنصر.`,
    notAllowed: `${E.error} ما عندك صلاحية تدير هذا التكت.`,
  },

  modmail: {
    notAThread: `${E.error} \`!انهاء\` يشتغل داخل ثريد التحقيق بالبلاغ بس.`,
    notAllowed: `${E.error} أنت مو مسؤول عن هذا البلاغ.`,
    alreadyClosed: `${E.error} هذا البلاغ مغلق أصلاً.`,
    claimFirst: `${E.warning} استلم البلاغ قبل ما تنهي التحقيق.`,
    ended: (caseId: string) =>
      `${E.success} تم إنهاء التحقيق في \`${caseId}\` وتحديده كـ **RESOLVED**. خطوة العقوبة / الحل راح يتكفل فيها نظام الحلول لاحقاً.`,
  },

  staff: {
    rolesNotConfigured: `${E.error} رتب الستاف المرقّمة مو مضبوطة. شغّل \`/role start\` و \`/role end\` أول.`,
    memberNotFound: `${E.error} هذا العضو مو موجود في السيرفر.`,
    notStaffMember: (userMention: string) => `${E.error} ${userMention} مو عضو ستاف.`,
    levelOutOfRange: (max: number) => `${E.error} المستوى لازم يكون بين 0 و ${max}.`,
    accepted: (userMention: string, level: number) =>
      `${E.success} تم قبول ${userMention} كـ ستاف على المستوى **${level}**.`,
    fired: (userMention: string) => `${E.success} تم فصل ${userMention} من الستاف.`,
    blacklisted: (userMention: string) => `${E.success} تم فصل ${userMention} ووضعه في القائمة السوداء.`,
    blacklistRoleMissing: `${E.error} رتبة البلاك ليست مو مضبوطة (\`/role blacklist\`).`,
    promoted: (userMention: string, from: number, to: number) =>
      `${E.success} تمت ترقية ${userMention} **${from} → ${to}**.`,
    demoted: (userMention: string, from: number, to: number) =>
      `${E.success} تم تنزيل ${userMention} **${from} → ${to}**.`,
    alreadyMaxLevel: (userMention: string) => `${E.warning} ${userMention} وصل أعلى مستوى أصلاً.`,
    alreadyMinLevel: (userMention: string) => `${E.warning} ${userMention} على المستوى 0 أصلاً. استخدم \`!فصل\` عشان تشيله.`,
    acceptUsage: `${E.warning} الطريقة: \`!قبول @عضو [المستوى]\``,
    fireUsage: `${E.warning} الطريقة: \`!فصل @عضو\` للفصل العادي · \`!فصل @عضو =\` للفصل + القائمة السوداء`,
    promoteUsage: `${E.warning} الطريقة: \`!ترقية @عضو [عدد-المستويات]\``,
    demoteUsage: `${E.warning} الطريقة: \`!تنزيل @عضو [عدد-المستويات]\``,
  },

  warn: {
    userWarnUsage: `${E.warning} الطريقة: \`!تحذير @عضو <السبب>\``,
    reasonRequired: `${E.warning} لازم تكتب سبب للتحذير.`,
    userWarned: (userMention: string, reason: string) =>
      `${E.warning} تم تحذير ${userMention}.\n**السبب:** ${reason}`,

    verbalRecorded: (userMention: string, reason: string) =>
      `${E.warning} تم تسجيل تحذير شفوي على ${userMention}.\n**السبب:** ${reason}`,
    convertedToReal: (count: number) =>
      `${E.warning} تم تحويل ${count} تحذيرات شفوية إلى تحذير رسمي.`,
    realRecorded: (userMention: string, level: number) =>
      `${E.warning} تم تسجيل ${ordinalWarning(level)} على ${userMention}.`,
    firedMaxWarnings: (userMention: string) =>
      `${E.error} تم فصل ${userMention} ووضعه في القائمة السوداء بسبب وصوله للحد الأقصى من التحذيرات.`,

    staffWarnManagerOnly: `${E.error} إصدار تحذيرات الستاف لمانجرات الستاف بس.`,
    staffWarnTargetNotStaff: (userMention: string) =>
      `${E.error} ${userMention} مو عضو ستاف — استخدم روم ${E.report} تحذيرات الأعضاء بدال كذا.`,
    staffWarnTargetInactive: (userMention: string) =>
      `${E.error} ${userMention} مو عضو ستاف نشط، ما ينفع يتحذّر.`,
    staffWarnRoleMissing: (level: number) =>
      `${E.error} رتبة تحذير الستاف ${level} مو مضبوطة (\`/role warn\`).`,

    unwarnUsage: `${E.warning} الطريقة: \`!الغاء-تحذير @عضو <آيدي-التحذير>\``,
    warningNotFound: `${E.error} ما فيه تحذير بهذا الآيدي.`,
    warningWrongUser: `${E.error} هذا التحذير مو حق هذا العضو.`,
    warningAlreadyInactive: `${E.warning} هذا التحذير ملغي / محذوف أصلاً.`,
    unwarnedUser: (userMention: string) => `${E.success} تم إلغاء تحذير العضو ${userMention}.`,
    unwarnedVerbal: (userMention: string) =>
      `${E.success} تم إلغاء التحذير الشفوي عن ${userMention}، وما راح يُحسب في التصعيد.`,
    unwarnedReal: (userMention: string) =>
      `${E.success} تم حذف التحذير الرسمي عن ${userMention} وتعديل رتبة التحذير حسب المتبقّي.`,

    warnsUsage: `${E.warning} الطريقة: \`!تحذيرات <آيدي-التحذير>\``,
    noWarnings: (userMention: string) => `ما فيه تحذيرات مسجلة على ${userMention}.`,
    warningsHeader: (userMention: string) => `**تحذيرات ${userMention}**`,
    verbalSection: "**التحذيرات الشفوية:**",
    realSection: "**التحذيرات الرسمية:**",
    verbalSummary: (active: number, converted: number) =>
      `${converted} محوَّلة · ${active} نشطة`,
    realSummary: (level: number) => (level > 0 ? ordinalWarning(level) : "ما فيه تحذير رسمي"),
    verbalNone: "ما فيه تحذيرات شفوية.",
    typeLabel: (kind: "VERBAL" | "REAL") => (kind === "VERBAL" ? "تحذير شفوي" : "تحذير رسمي"),
    levelLabel: (level: number) => ordinalWarning(level),
    convertedStatusLabel: "تم تحويله إلى تحذير رسمي",
    userWarnLine: (index: number, id: string, status: string, reason: string) =>
      `\`${index}.\` \`${id}\` · ${status} · ${reason}`,
    staffWarnLine: (index: number, id: string, level: number, status: string, reason: string) =>
      `\`${index}.\` \`${id}\` · **L${level}** · ${status} · ${reason}`,
    privacyDenied: `${E.error} تقدر تشوف تحذيراتك أنت بس.`,
    detailNotAllowed: `${E.error} ما عندك صلاحية تشوف هذا التحذير.`,
  },
} as const;
