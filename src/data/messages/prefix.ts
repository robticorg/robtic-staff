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
    notApplyManager: `${E.error} هذا لمانجرات التقديم بس.`,
    notHighStaff: `${E.error} هذا الأمر للهاي ستاف فما فوق.`,
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
    closed: (caseId: string) => `${E.success} تم إقفال البلاغ \`${caseId}\`.`,
    ended: (caseId: string) =>
      `${E.success} تم إنهاء التحقيق في \`${caseId}\` وتحديده كـ **RESOLVED**. خطوة العقوبة / الحل راح يتكفل فيها نظام الحلول لاحقاً.`,
  },

  staff: {
    rolesNotConfigured: `${E.error} رتب الستاف المرقّمة مو مضبوطة. شغّل \`/role set type:رتبة بداية الستاف\` و \`/role set type:رتبة نهاية الستاف\` أول.`,
    memberNotFound: `${E.error} هذا العضو مو موجود في السيرفر.`,
    notStaffMember: (userMention: string) => `${E.error} ${userMention} مو عضو ستاف.`,
    levelOutOfRange: (max: number) => `${E.error} المستوى لازم يكون بين 0 و ${max}.`,
    accepted: (userMention: string, level: number) =>
      `${E.success} تم قبول ${userMention} كـ ستاف على المستوى **${level}**.`,
    acceptedWithType: (userMention: string, level: number, typeLabel: string) =>
      `${E.success} تم قبول ${userMention} كـ ستاف **${typeLabel}** على المستوى **${level}**.`,
    unknownStaffType: (token: string, available: string) =>
      `${E.error} نوع الستاف غير معروف: \`${token}\`. الأنواع المتاحة: ${available}.`,
    duplicateStaffLevel: `${E.error} حدد مستوى واحد بس.`,
    duplicateStaffType: `${E.error} حدد نوع ستاف واحد بس.`,
    duplicateStaffTier: `${E.error} حدد تصنيف واحد بس.`,
    levelAndTier: `${E.error} ما ينفع تحدد مستوى وتصنيف مع بعض — التصنيف نفسه يحدد المستوى.`,
    tierNotConfigured: (tierLabel: string, slug: string) =>
      `${E.error} تصنيف **${tierLabel}** مو مضبوط. شغّل \`/role boundary tier:${slug}\` وحدد أول رتبة فيه.`,
    acceptedWithTier: (userMention: string, level: number, tierLabel: string) =>
      `${E.success} تم قبول ${userMention} كـ **${tierLabel}** على المستوى **${level}**.`,
    acceptedWithTierAndType: (
      userMention: string,
      level: number,
      tierLabel: string,
      typeLabel: string,
    ) =>
      `${E.success} تم قبول ${userMention} كـ **${tierLabel}** ونوعه **${typeLabel}** على المستوى **${level}**.`,
    staffTypeRoleMissing: (typeLabel: string, slug: string) =>
      `${E.error} رتبة نوع الستاف **${typeLabel}** مو مضبوطة. شغّل \`/role stafftype type:${slug}\` أول.`,
    fired: (userMention: string) => `${E.success} تم فصل ${userMention} من الستاف.`,
    blacklisted: (userMention: string) => `${E.success} تم فصل ${userMention} ووضعه في القائمة السوداء.`,
    blacklistRoleMissing: `${E.error} رتبة البلاك ليست مو مضبوطة (\`/role set type:رتبة البلاك ليست\`).`,
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

  jail: {
    usage: `${E.warning} الطريقة: \`!سجن @عضو <السبب>\` — وأرفق الدليل مع الرسالة.`,
    reasonRequired: `${E.warning} لازم تكتب سبب للسجن.`,
    proofRequired: `${E.warning} لازم ترفق دليل (صورة/سكرين) مع السجن — بدون دليل ما ينفّذ.`,
    self: `${E.error} ما تقدر تسجن نفسك.`,
    bot: `${E.error} ما تقدر تسجن بوت.`,
    jailed: (mention: string, reason: string) =>
      `${E.success} تم سجن ${mention}.\nالسبب: ${reason}`,
    failed: (reason: string) =>
      `${E.error} ما تم تنفيذ السجن — ${reason}\nما انحفظت العقوبة كمنفّذة.`,
  },

  unjail: {
    usage: `${E.warning} الطريقة: \`!فك @عضو [السبب]\``,
    notJailed: (mention: string) => `${E.warning} ${mention} مو مسجون أصلاً.`,
    released: (mention: string) => `${E.success} تم فك سجن ${mention}.`,
    releasedRoleOnly: (mention: string) =>
      `${E.success} تم شيل رتبة السجن عن ${mention}.\n${E.warning} ما فيه سجل عقوبة مرتبط فيه — كان مسجون يدوياً.`,
    roleRemoveFailed: (mention: string, reason: string) =>
      `${E.warning} تم تسجيل فك السجن عن ${mention}، بس ما قدرت أشيل الرتبة — ${reason}\nشيلها يدوياً.`,
    defaultReason: (actorId: string) => `فك سجن بواسطة ${actorId}`,
  },

  warn: {
    userWarnUsage: `${E.warning} الطريقة: \`!تحذير @عضو <السبب>\``,
    reasonRequired: `${E.warning} لازم تكتب سبب للتحذير.`,
    proofRequired: `${E.warning} لازم ترفق دليل (صورة/سكرين) مع تحذير الستاف — بدون دليل ما ينسجّل.`,
    userWarned: (userMention: string, reason: string) =>
      `${E.warning} تم تحذير ${userMention}.\n**السبب:** ${reason}`,

    verbalRecorded: (userMention: string, reason: string) =>
      `${E.warning} تم تسجيل تحذير شفوي على ${userMention}.\n**السبب:** ${reason}`,
    convertedToReal: (count: number) =>
      `${E.warning} تم تحويل ${count} تحذيرات شفوية إلى تحذير رسمي.`,
    realRecorded: (userMention: string, level: number) =>
      `${E.warning} تم تسجيل ${ordinalWarning(level)} على ${userMention}.`,
    demotedMaxWarnings: (userMention: string, from: number, to: number) =>
      `${E.warning} ${userMention} وصل **3 تحذيرات** — تم تنزيله **${from} → ${to}** وتصفير تحذيراته.`,
    firedNoLevelLeft: (userMention: string) =>
      `${E.error} ${userMention} وصل **3 تحذيرات** وهو على المستوى 0 — ما فيه مستوى أقل، فتم فصله من الستاف.`,
    firedMaxWarnings: (userMention: string) =>
      `${E.error} تم فصل ${userMention} ووضعه في القائمة السوداء بسبب وصوله للحد الأقصى من التحذيرات.`,

    staffWarnManagerOnly: `${E.error} إصدار تحذيرات الستاف لمانجرات الستاف بس.`,
    staffWarnTargetNotStaff: (userMention: string) =>
      `${E.error} ${userMention} مو عضو ستاف — استخدم روم ${E.report} تحذيرات الأعضاء بدال كذا.`,
    staffWarnTargetInactive: (userMention: string) =>
      `${E.error} ${userMention} مو عضو ستاف نشط، ما ينفع يتحذّر.`,
    staffWarnRoleMissing: (level: number) =>
      `${E.error} رتبة تحذير الستاف ${level} مو مضبوطة (\`/role set type:رتبة تحذير الستاف\`).`,

    unwarnUsage: [
      `${E.warning} الطريقة:`,
      "`!الغاء-تحذير @عضو staff` — يشيل تحذير الستاف الحالي",
      "`!الغاء-تحذير @عضو <آيدي-التحذير>` — يشيل هذا التحذير بالذات (ستاف أو عضو)",
    ].join("\n"),
    unwarnWarningIdRequired: `${E.warning} حط آيدي التحذير، أو اكتب \`staff\` عشان تشيل تحذير الستاف: \`!الغاء-تحذير @عضو <staff | آيدي-التحذير>\``,
    noActiveRealWarning: (userMention: string) =>
      `${E.warning} ${userMention} ما عليه تحذير رسمي نشط نقدر نشيله.`,
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
