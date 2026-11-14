import { emojis } from "../emojis/index.ts";
import { bilingual, currentLang } from "../../shared/utils/lang-context.ts";

const E = emojis;

/** "+2 points" — the amount comes from the guild's ticket-claim value (/points values). */
const ticketPointsText = (points: number) =>
  currentLang() === "en" ? `+${points} point${points === 1 ? "" : "s"}` : `+${points} ${points === 1 ? "نقطة" : "نقاط"}`;

function ordinalWarning(level: number): string {
  if (currentLang() === "en") return `Warning ${level}`;
  return ({ 1: "التحذير الأول", 2: "التحذير الثاني", 3: "التحذير الثالث" } as Record<number, string>)[level] ?? `التحذير ${level}`;
}

const at = (until: Date) => `<t:${Math.floor(until.getTime() / 1000)}:R>`;

export const prefixMessages = bilingual(
  {
    common: {
      guildOnly: `${E.error} Prefix commands work in a server only.`,
      genericError: `${E.error} Something went wrong running that command.`,
      notStaff: `${E.error} You don't have permission to use this.`,
      notStaffManager: `${E.error} Staff managers only.`,
      notAcceptManager: `${E.error} Application and transfer managers only.`,
      notHighStaff: `${E.error} High staff and above only.`,
      usage: (usage: string) => `${E.warning} Usage: \`${usage}\``,
      needUserTarget: `${E.warning} Mention the member or give their ID.`,
    },

    ticket: {
      notATicket: `${E.error} Use this inside a ticket.`,
      ticketClosed: `${E.error} This ticket is closed.`,
      claimed: (ticketName: string, points: number) => `${E.success} Claimed \`${ticketName}\`. **${ticketPointsText(points)}**`,
      claimedNoPoint: (ticketName: string) => `${E.success} You're now handling \`${ticketName}\`.`,
      closed: (ticketName: string) => `${E.success} Closed \`${ticketName}\`.`,
      closedWithTranscript: (ticketName: string, transcriptId: string) => `${E.success} Closed \`${ticketName}\`. Transcript \`${transcriptId}\` saved.`,
      willBeDeleted: `${E.warning} This ticket will be deleted shortly.`,
      deleted: (ticketName: string) => `${E.success} Deleted \`${ticketName}\` (record kept).`,
      renamed: (name: string) => `${E.success} Renamed to \`${name}\`.`,
      renameUsage: `${E.warning} Usage: \`!rename <new-name>\``,
      transcriptSaved: (transcriptId: string) => `${E.success} Transcript saved: \`${transcriptId}\`.`,
      addUsage: `${E.warning} Usage: \`!add <@member|@role> …\``,
      removeUsage: `${E.warning} Usage: \`!remove <@member|@role> …\``,
      nothingToAdd: `${E.warning} Mention at least one member or role to add.`,
      nothingToRemove: `${E.warning} Mention at least one member or role to remove.`,
      added: (users: number, roles: number) => `${E.success} Added ${users} member(s) and ${roles} role(s).`,
      removed: (count: number, skipped: number) =>
        skipped > 0
          ? `${E.success} Removed ${count}. Skipped ${skipped} protected (owner, claimer or support role).`
          : `${E.success} Removed ${count}.`,
      notAllowed: `${E.error} You can't manage this ticket.`,
    },

    modmail: {
      notAThread: `${E.error} \`!end\` works inside a report thread only.`,
      notAllowed: `${E.error} This report isn't yours.`,
      alreadyClosed: `${E.error} This report is already closed.`,
      claimFirst: `${E.warning} Claim the report first.`,
      closed: (caseId: string) => `${E.success} Report \`${caseId}\` closed.`,
      ended: (caseId: string) => `${E.success} Investigation \`${caseId}\` ended and marked **RESOLVED**.`,
    },

    staff: {
      rolesNotConfigured: `${E.error} The staff ladder isn't set up. Set the start and end roles on the dashboard (Ranks & roles).`,
      memberNotFound: `${E.error} That member isn't in the server.`,
      notStaffMember: (userMention: string) => `${E.error} ${userMention} isn't staff.`,
      levelOutOfRange: (min: number, max: number) => `${E.error} Level must be ${min} to ${max}.`,
      accepted: (userMention: string, level: number) => `${E.success} ${userMention} accepted at level **${level}**.`,
      acceptedWithType: (userMention: string, level: number, typeLabel: string) => `${E.success} ${userMention} accepted as **${typeLabel}**, level **${level}**.`,
      unknownStaffType: (token: string, available: string) => `${E.error} Unknown staff type \`${token}\`. Available: ${available}.`,
      duplicateStaffLevel: `${E.error} Give one level only.`,
      duplicateStaffType: `${E.error} Give one staff type only.`,
      duplicateStaffTier: `${E.error} Give one tier only.`,
      levelAndTier: `${E.error} Give a level or a tier, not both.`,
      tierNotConfigured: (tierLabel: string, slug: string) => `${E.error} **${tierLabel}** isn't set up. Run \`/role boundary tier:${slug}\`.`,
      acceptedWithTier: (userMention: string, level: number, tierLabel: string) => `${E.success} ${userMention} accepted as **${tierLabel}**, level **${level}**.`,
      acceptedWithTierAndType: (userMention: string, level: number, tierLabel: string, typeLabel: string) =>
        `${E.success} ${userMention} accepted as **${tierLabel}** (${typeLabel}), level **${level}**.`,
      staffTypeRoleMissing: (typeLabel: string, slug: string) => `${E.error} The **${typeLabel}** role isn't set. Run \`/role stafftype type:${slug}\`.`,
      fired: (userMention: string) => `${E.success} ${userMention} removed from staff.`,
      blacklisted: (userMention: string) => `${E.success} ${userMention} removed and blacklisted.`,
      blacklistRoleMissing: `${E.error} The blacklist role isn't set.`,
      promoted: (userMention: string, from: number, to: number) => `${E.success} ${userMention} promoted **${from} → ${to}**.`,
      demoted: (userMention: string, from: number, to: number) => `${E.success} ${userMention} demoted **${from} → ${to}**.`,
      alreadyMaxLevel: (userMention: string) => `${E.warning} ${userMention} is already at the top level.`,
      alreadyStaff: (userMention: string) => `${E.warning} ${userMention} is already staff. Use \`!promote\` or \`!demote\`.`,
      promoteTierNotHigher: (userMention: string, tierLabel: string, level: number) => `${E.warning} ${userMention} is already **${tierLabel}** or higher (level ${level}).`,
      demoteTierNotLower: (userMention: string, tierLabel: string, level: number) => `${E.warning} ${userMention} is already **${tierLabel}** or lower (level ${level}).`,
      tierTokenUnknown: (token: string, available: string) => `${E.error} \`${token}\` isn't a number of levels or one of: ${available}.`,

      backUsage: `${E.warning} Usage: \`!back @member\``,
      backNoRecord: (userMention: string) => `${E.error} ${userMention} has no past staff record. Use \`!accept\`.`,
      backNothingToDo: (userMention: string) => `${E.warning} ${userMention} is already staff with all roles.`,
      backBlacklisted: (userMention: string) => `${E.error} ${userMention} is blacklisted.`,
      backOnBreak: (userMention: string) => `${E.warning} ${userMention} is on a break. Use \`!unbreak\`.`,
      backDone: (userMention: string, level: number) => `${E.success} ${userMention} is back on staff at level **${level}**.`,
      alreadyMinLevel: (userMention: string) => `${E.warning} ${userMention} is at the lowest level. Use \`!fire\` to remove them.`,
      acceptUsage: `${E.warning} Usage: \`!accept @member [level]\``,
      fireUsage: `${E.warning} Usage: \`!fire @member\` · \`!fire @member =\` to also blacklist`,
      promoteUsage: `${E.warning} Usage: \`!promote @member [levels | high | owner | ship | max]\``,
      demoteUsage: `${E.warning} Usage: \`!demote @member [levels | high | owner | ship]\``,
    },

    jail: {
      usage: `${E.warning} Usage: \`!jail @member <reason> [duration like 2h or 3d, default 28d]\` with proof attached.`,
      reasonRequired: `${E.warning} Give a reason, or a duration like \`3d\`.`,
      noReason: "No reason",
      durationOutOfRange: `${E.warning} Duration must be 1 minute to 365 days.`,
      jailedFor: (mention: string, reason: string, duration: string, until: Date) =>
        `${E.success} ${mention} jailed for **${duration}**. Reason: ${reason}. Released ${at(until)}.`,
      proofRequired: `${E.warning} Attach proof (an image) to jail someone.`,
      self: `${E.error} You can't jail yourself.`,
      bot: `${E.error} You can't jail a bot.`,
      jailed: (mention: string, reason: string) => `${E.success} ${mention} jailed. Reason: ${reason}`,
      failed: (reason: string) => `${E.error} Jail failed: ${reason}`,
      denied: {
        TARGET_IS_STAFF: `${E.error} Staff can't be jailed. Use staff warnings instead.`,
        TARGET_OUTRANKS_ACTOR: `${E.error} You can't jail someone at or above your rank.`,
      } as Record<string, string>,
    },

    unjail: {
      usage: `${E.warning} Usage: \`!unjail @member [reason]\``,
      notJailed: (mention: string) => `${E.warning} ${mention} isn't jailed.`,
      released: (mention: string) => `${E.success} ${mention} released.`,
      releasedRoleOnly: (mention: string) => `${E.success} Jail role removed from ${mention} (they were jailed by hand, no record).`,
      roleRemoveFailed: (mention: string, reason: string) => `${E.warning} ${mention} released, but I couldn't remove the role (${reason}). Remove it by hand.`,
      defaultReason: (actorId: string) => `Released by ${actorId}`,
    },

    warn: {
      userWarnUsage: `${E.warning} Usage: \`!warn @member <reason>\``,
      reasonRequired: `${E.warning} Give a reason for the warning.`,
      noReason: "No reason",
      proofRequired: `${E.warning} Attach proof (an image) to warn staff.`,
      userWarned: (userMention: string, reason: string) => `${E.warning} ${userMention} warned. **Reason:** ${reason}`,

      verbalRecorded: (userMention: string, reason: string) => `${E.warning} Verbal warning for ${userMention}. **Reason:** ${reason}`,
      convertedToReal: (count: number) => `${E.warning} ${count} verbal warnings turned into an official warning.`,
      realRecorded: (userMention: string, level: number) => `${E.warning} ${ordinalWarning(level)} for ${userMention}.`,
      demotedMaxWarnings: (userMention: string, from: number, to: number) => `${E.warning} ${userMention} hit **3 warnings**: demoted **${from} → ${to}**, warnings reset.`,
      firedNoLevelLeft: (userMention: string) => `${E.error} ${userMention} hit **3 warnings** at level 0 and was removed from staff.`,
      firedMaxWarnings: (userMention: string) => `${E.error} ${userMention} removed and blacklisted for reaching the warning limit.`,

      staffWarnManagerOnly: `${E.error} Only staff managers can warn staff.`,
      staffWarnTargetNotStaff: (userMention: string) => `${E.error} ${userMention} isn't staff. Use the member warnings channel.`,
      staffWarnTargetInactive: (userMention: string) => `${E.error} ${userMention} isn't active staff.`,
      staffWarnRoleMissing: (level: number) => `${E.error} The staff warning ${level} role isn't set.`,

      unwarnUsage: [
        `${E.warning} Usage:`,
        "`!unwarn @member staff` removes their current staff warning",
        "`!unwarn @member <warning-id>` removes that warning",
      ].join("\n"),
      unwarnWarningIdRequired: `${E.warning} Give the warning ID, or \`staff\`: \`!unwarn @member <staff | warning-id>\``,
      noActiveRealWarning: (userMention: string) => `${E.warning} ${userMention} has no active official warning.`,
      warningNotFound: `${E.error} No warning with that ID.`,
      warningWrongUser: `${E.error} That warning belongs to someone else.`,
      warningAlreadyInactive: `${E.warning} That warning was already removed.`,
      unwarnedUser: (userMention: string) => `${E.success} Warning removed from ${userMention}.`,
      unwarnedVerbal: (userMention: string) => `${E.success} Verbal warning removed from ${userMention}.`,
      unwarnedReal: (userMention: string) => `${E.success} Official warning removed from ${userMention}; warning role updated.`,

      warnsUsage: `${E.warning} Usage: \`!warnings <warning-id>\``,
      noWarnings: (userMention: string) => `No warnings for ${userMention}.`,
      warningsHeader: (userMention: string) => `**${userMention}'s warnings**`,
      verbalSection: "**Verbal:**",
      realSection: "**Official:**",
      verbalSummary: (active: number, converted: number) => `${converted} converted · ${active} active`,
      realSummary: (level: number) => (level > 0 ? ordinalWarning(level) : "No official warning"),
      verbalNone: "No verbal warnings.",
      typeLabel: (kind: "VERBAL" | "REAL"): string => (kind === "VERBAL" ? "Verbal" : "Official"),
      levelLabel: (level: number) => ordinalWarning(level),
      convertedStatusLabel: "Turned official",
      userWarnLine: (index: number, id: string, status: string, reason: string) => `\`${index}.\` \`${id}\` · ${status} · ${reason}`,
      staffWarnLine: (index: number, id: string, level: number, status: string, reason: string) => `\`${index}.\` \`${id}\` · **L${level}** · ${status} · ${reason}`,
      privacyDenied: `${E.error} You can only see your own warnings.`,
      detailNotAllowed: `${E.error} You can't see this warning.`,
    },
  },
  {
    common: {
      guildOnly: `${E.error} هذا الأمر متاح داخل السيرفر فقط.`,
      genericError: `${E.error} حدث خطأ أثناء تنفيذ الأمر.`,
      notStaff: `${E.error} لا تملك صلاحية استخدام هذا الأمر.`,
      notStaffManager: `${E.error} هذا الأمر مخصص لمسؤولي الطاقم فقط.`,
      notAcceptManager: `${E.error} هذا الأمر مخصص لمسؤولي التقديم والنقل فقط.`,
      notHighStaff: `${E.error} هذا الأمر مخصص للإدارة العليا فقط.`,
      usage: (usage: string) => `${E.warning} طريقة الاستخدام: \`${usage}\``,
      needUserTarget: `${E.warning} يرجى منشن العضو أو كتابة الآيدي.`,
    },

    ticket: {
      notATicket: `${E.error} يُستخدم هذا الأمر داخل التذكرة فقط.`,
      ticketClosed: `${E.error} هذه التذكرة مغلقة.`,
      claimed: (ticketName: string, points: number) => `${E.success} تم استلام \`${ticketName}\`. **${ticketPointsText(points)}**`,
      claimedNoPoint: (ticketName: string) => `${E.success} أصبحت مسؤولاً عن \`${ticketName}\`.`,
      closed: (ticketName: string) => `${E.success} تم إغلاق \`${ticketName}\`.`,
      closedWithTranscript: (ticketName: string, transcriptId: string) => `${E.success} تم إغلاق \`${ticketName}\` وحفظ النسخة \`${transcriptId}\`.`,
      willBeDeleted: `${E.warning} سيتم حذف التذكرة خلال لحظات.`,
      deleted: (ticketName: string) => `${E.success} تم حذف \`${ticketName}\` مع الاحتفاظ بالسجل.`,
      renamed: (name: string) => `${E.success} تم تغيير اسم التذكرة إلى \`${name}\`.`,
      renameUsage: `${E.warning} طريقة الاستخدام: \`!تغيير-الاسم <الاسم-الجديد>\``,
      transcriptSaved: (transcriptId: string) => `${E.success} تم حفظ النسخة: \`${transcriptId}\`.`,
      addUsage: `${E.warning} طريقة الاستخدام: \`!اضافة <@عضو|@رتبة> …\``,
      removeUsage: `${E.warning} طريقة الاستخدام: \`!ازالة <@عضو|@رتبة> …\``,
      nothingToAdd: `${E.warning} يرجى منشن عضو أو رتبة لإضافتها.`,
      nothingToRemove: `${E.warning} يرجى منشن عضو أو رتبة لإزالتها.`,
      added: (users: number, roles: number) => `${E.success} تمت إضافة ${users} عضو و${roles} رتبة.`,
      removed: (count: number, skipped: number) =>
        skipped > 0
          ? `${E.success} تمت إزالة ${count}، وتم تجاوز ${skipped} محمي (صاحب التذكرة أو المستلم أو رتبة الدعم).`
          : `${E.success} تمت إزالة ${count}.`,
      notAllowed: `${E.error} لا تملك صلاحية إدارة هذه التذكرة.`,
    },

    modmail: {
      notAThread: `${E.error} يُستخدم \`!انهاء\` داخل ثريد البلاغ فقط.`,
      notAllowed: `${E.error} هذا البلاغ ليس من مسؤوليتك.`,
      alreadyClosed: `${E.error} هذا البلاغ مغلق مسبقاً.`,
      claimFirst: `${E.warning} يرجى استلام البلاغ أولاً.`,
      closed: (caseId: string) => `${E.success} تم إغلاق البلاغ \`${caseId}\`.`,
      ended: (caseId: string) => `${E.success} تم إنهاء التحقيق \`${caseId}\` وتسجيله كمحلول.`,
    },

    staff: {
      rolesNotConfigured: `${E.error} سلّم الطاقم غير مُعدّ. يرجى تحديد رتبة البداية والنهاية من لوحة التحكم (الرتب).`,
      memberNotFound: `${E.error} العضو غير موجود في السيرفر.`,
      notStaffMember: (userMention: string) => `${E.error} ${userMention} ليس من الطاقم.`,
      levelOutOfRange: (min: number, max: number) => `${E.error} يجب أن يكون المستوى من ${min} إلى ${max}.`,
      accepted: (userMention: string, level: number) => `${E.success} تم قبول ${userMention} في الإدارة على المستوى **${level}**.`,
      acceptedWithType: (userMention: string, level: number, typeLabel: string) => `${E.success} تم قبول ${userMention} في الإدارة بصفة **${typeLabel}** على المستوى **${level}**.`,
      unknownStaffType: (token: string, available: string) => `${E.error} النوع \`${token}\` غير معروف. الأنواع المتاحة: ${available}.`,
      duplicateStaffLevel: `${E.error} يرجى تحديد مستوى واحد فقط.`,
      duplicateStaffType: `${E.error} يرجى تحديد نوع واحد فقط.`,
      duplicateStaffTier: `${E.error} يرجى تحديد تصنيف واحد فقط.`,
      levelAndTier: `${E.error} يرجى تحديد مستوى أو تصنيف، وليس كليهما.`,
      tierNotConfigured: (tierLabel: string, slug: string) => `${E.error} تصنيف **${tierLabel}** غير مُعدّ. استخدم \`/role boundary tier:${slug}\`.`,
      acceptedWithTier: (userMention: string, level: number, tierLabel: string) => `${E.success} تم قبول ${userMention} في الإدارة بصفة **${tierLabel}** على المستوى **${level}**.`,
      acceptedWithTierAndType: (userMention: string, level: number, tierLabel: string, typeLabel: string) =>
        `${E.success} تم قبول ${userMention} في الإدارة بصفة **${tierLabel}** (${typeLabel}) على المستوى **${level}**.`,
      staffTypeRoleMissing: (typeLabel: string, slug: string) => `${E.error} رتبة **${typeLabel}** غير مُعدّة. استخدم \`/role stafftype type:${slug}\`.`,
      fired: (userMention: string) => `${E.success} تم فصل ${userMention} من الطاقم.`,
      blacklisted: (userMention: string) => `${E.success} تم فصل ${userMention} وإضافته إلى القائمة السوداء.`,
      blacklistRoleMissing: `${E.error} رتبة القائمة السوداء غير مُعدّة.`,
      promoted: (userMention: string, from: number, to: number) => `${E.success} تمت ترقية ${userMention} من **${from}** إلى **${to}**.`,
      demoted: (userMention: string, from: number, to: number) => `${E.success} تم تنزيل ${userMention} من **${from}** إلى **${to}**.`,
      alreadyMaxLevel: (userMention: string) => `${E.warning} ${userMention} في أعلى مستوى.`,
      alreadyStaff: (userMention: string) => `${E.warning} ${userMention} من الطاقم بالفعل. استخدم \`!ترقية\` أو \`!تنزيل\`.`,
      promoteTierNotHigher: (userMention: string, tierLabel: string, level: number) => `${E.warning} ${userMention} في تصنيف **${tierLabel}** أو أعلى بالفعل (المستوى ${level}).`,
      demoteTierNotLower: (userMention: string, tierLabel: string, level: number) => `${E.warning} ${userMention} في تصنيف **${tierLabel}** أو أقل بالفعل (المستوى ${level}).`,
      tierTokenUnknown: (token: string, available: string) => `${E.error} \`${token}\` ليس عدد مستويات ولا أحد التصنيفات: ${available}.`,

      backUsage: `${E.warning} طريقة الاستخدام: \`!back @عضو\``,
      backNoRecord: (userMention: string) => `${E.error} لا يوجد سجل إداري سابق لـ ${userMention}. استخدم \`!قبول\`.`,
      backNothingToDo: (userMention: string) => `${E.warning} ${userMention} من الطاقم ولديه جميع رتبه.`,
      backBlacklisted: (userMention: string) => `${E.error} ${userMention} في القائمة السوداء.`,
      backOnBreak: (userMention: string) => `${E.warning} ${userMention} في إجازة. استخدم \`!unbreak\`.`,
      backDone: (userMention: string, level: number) => `${E.success} تمت إعادة ${userMention} إلى الطاقم على المستوى **${level}**.`,
      alreadyMinLevel: (userMention: string) => `${E.warning} ${userMention} في أدنى مستوى. استخدم \`!فصل\` لإزالته.`,
      acceptUsage: `${E.warning} طريقة الاستخدام: \`!قبول @عضو [المستوى]\``,
      fireUsage: `${E.warning} طريقة الاستخدام: \`!فصل @عضو\` · \`!فصل @عضو =\` للفصل مع القائمة السوداء`,
      promoteUsage: `${E.warning} طريقة الاستخدام: \`!ترقية @عضو [عدد | high | owner | ship | max]\``,
      demoteUsage: `${E.warning} طريقة الاستخدام: \`!تنزيل @عضو [عدد | high | owner | ship]\``,
    },

    jail: {
      usage: `${E.warning} طريقة الاستخدام: \`!سجن @عضو <السبب> [المدة مثل 2h أو 3d، الافتراضي 28 يوماً]\` مع إرفاق دليل.`,
      reasonRequired: `${E.warning} يرجى كتابة السبب أو مدة مثل \`3d\`.`,
      noReason: "بدون سبب",
      durationOutOfRange: `${E.warning} يجب أن تكون المدة من دقيقة إلى 365 يوماً.`,
      jailedFor: (mention: string, reason: string, duration: string, until: Date) =>
        `${E.success} تم سجن ${mention} لمدة **${duration}**. السبب: ${reason}. ينتهي ${at(until)}.`,
      proofRequired: `${E.warning} يرجى إرفاق دليل (صورة) للسجن.`,
      self: `${E.error} لا يمكنك سجن نفسك.`,
      bot: `${E.error} لا يمكن سجن بوت.`,
      jailed: (mention: string, reason: string) => `${E.success} تم سجن ${mention}. السبب: ${reason}`,
      failed: (reason: string) => `${E.error} تعذّر السجن: ${reason}`,
      denied: {
        TARGET_IS_STAFF: `${E.error} لا يمكن سجن الإداري، تُطبَّق عليه التحذيرات الإدارية.`,
        TARGET_OUTRANKS_ACTOR: `${E.error} لا يمكنك سجن عضو برتبة مساوية لرتبتك أو أعلى.`,
      } as Record<string, string>,
    },

    unjail: {
      usage: `${E.warning} طريقة الاستخدام: \`!فك @عضو [السبب]\``,
      notJailed: (mention: string) => `${E.warning} ${mention} ليس مسجوناً.`,
      released: (mention: string) => `${E.success} تم فك سجن ${mention}.`,
      releasedRoleOnly: (mention: string) => `${E.success} تمت إزالة رتبة السجن عن ${mention} (سُجن يدوياً دون سجل).`,
      roleRemoveFailed: (mention: string, reason: string) => `${E.warning} تم فك سجن ${mention}، لكن تعذّرت إزالة الرتبة (${reason}). يرجى إزالتها يدوياً.`,
      defaultReason: (actorId: string) => `فك سجن بواسطة ${actorId}`,
    },

    warn: {
      userWarnUsage: `${E.warning} طريقة الاستخدام: \`!تحذير @عضو <السبب>\``,
      reasonRequired: `${E.warning} يرجى كتابة سبب التحذير.`,
      noReason: "بدون سبب",
      proofRequired: `${E.warning} يرجى إرفاق دليل (صورة) لتحذير الإداري.`,
      userWarned: (userMention: string, reason: string) => `${E.warning} تم تحذير ${userMention}. **السبب:** ${reason}`,

      verbalRecorded: (userMention: string, reason: string) => `${E.warning} تم تسجيل تحذير شفوي على ${userMention}. **السبب:** ${reason}`,
      convertedToReal: (count: number) => `${E.warning} تم تحويل ${count} تحذيرات شفوية إلى تحذير رسمي.`,
      realRecorded: (userMention: string, level: number) => `${E.warning} تم تسجيل ${ordinalWarning(level)} على ${userMention}.`,
      demotedMaxWarnings: (userMention: string, from: number, to: number) => `${E.warning} وصل ${userMention} إلى **3 تحذيرات**، فتم تنزيله من **${from}** إلى **${to}** وتصفير التحذيرات.`,
      firedNoLevelLeft: (userMention: string) => `${E.error} وصل ${userMention} إلى **3 تحذيرات** وهو في المستوى 0، فتم فصله.`,
      firedMaxWarnings: (userMention: string) => `${E.error} تم فصل ${userMention} وإضافته إلى القائمة السوداء لبلوغه حد التحذيرات.`,

      staffWarnManagerOnly: `${E.error} تحذير الإداريين مخصص لمسؤولي الطاقم فقط.`,
      staffWarnTargetNotStaff: (userMention: string) => `${E.error} ${userMention} ليس من الطاقم. استخدم روم تحذيرات الأعضاء.`,
      staffWarnTargetInactive: (userMention: string) => `${E.error} ${userMention} ليس إدارياً نشطاً.`,
      staffWarnRoleMissing: (level: number) => `${E.error} رتبة التحذير الإداري ${level} غير مُعدّة.`,

      unwarnUsage: [
        `${E.warning} طريقة الاستخدام:`,
        "`!الغاء-تحذير @عضو staff` لإزالة التحذير الإداري الحالي",
        "`!الغاء-تحذير @عضو <آيدي-التحذير>` لإزالة تحذير محدد",
      ].join("\n"),
      unwarnWarningIdRequired: `${E.warning} يرجى كتابة آيدي التحذير أو \`staff\`: \`!الغاء-تحذير @عضو <staff | آيدي>\``,
      noActiveRealWarning: (userMention: string) => `${E.warning} لا يوجد تحذير رسمي نشط على ${userMention}.`,
      warningNotFound: `${E.error} لا يوجد تحذير بهذا الآيدي.`,
      warningWrongUser: `${E.error} هذا التحذير يخص عضواً آخر.`,
      warningAlreadyInactive: `${E.warning} هذا التحذير ملغى مسبقاً.`,
      unwarnedUser: (userMention: string) => `${E.success} تم إلغاء تحذير ${userMention}.`,
      unwarnedVerbal: (userMention: string) => `${E.success} تم إلغاء التحذير الشفوي عن ${userMention}.`,
      unwarnedReal: (userMention: string) => `${E.success} تم إلغاء التحذير الرسمي عن ${userMention} وتحديث رتبة التحذير.`,

      warnsUsage: `${E.warning} طريقة الاستخدام: \`!تحذيرات <آيدي-التحذير>\``,
      noWarnings: (userMention: string) => `لا توجد تحذيرات على ${userMention}.`,
      warningsHeader: (userMention: string) => `**تحذيرات ${userMention}**`,
      verbalSection: "**الشفوية:**",
      realSection: "**الرسمية:**",
      verbalSummary: (active: number, converted: number) => `${converted} محوَّلة · ${active} نشطة`,
      realSummary: (level: number) => (level > 0 ? ordinalWarning(level) : "لا يوجد تحذير رسمي"),
      verbalNone: "لا توجد تحذيرات شفوية.",
      typeLabel: (kind: "VERBAL" | "REAL") => (kind === "VERBAL" ? "شفوي" : "رسمي"),
      levelLabel: (level: number) => ordinalWarning(level),
      convertedStatusLabel: "حُوِّل إلى رسمي",
      userWarnLine: (index: number, id: string, status: string, reason: string) => `\`${index}.\` \`${id}\` · ${status} · ${reason}`,
      staffWarnLine: (index: number, id: string, level: number, status: string, reason: string) => `\`${index}.\` \`${id}\` · **L${level}** · ${status} · ${reason}`,
      privacyDenied: `${E.error} يمكنك عرض تحذيراتك فقط.`,
      detailNotAllowed: `${E.error} لا تملك صلاحية عرض هذا التحذير.`,
    },
  },
);
