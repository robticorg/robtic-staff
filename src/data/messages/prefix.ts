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
      guildOnly: `${E.error} أوامر البريفكس داخل السيرفر بس.`,
      genericError: `${E.error} صار خطأ أثناء تنفيذ الأمر.`,
      notStaff: `${E.error} ما عندك صلاحية لهذا.`,
      notStaffManager: `${E.error} لمانجرات الطاقم بس.`,
      notAcceptManager: `${E.error} لمانجرات التقديم والتحويل بس.`,
      notHighStaff: `${E.error} للإدارة العليا فما فوق.`,
      usage: (usage: string) => `${E.warning} الطريقة: \`${usage}\``,
      needUserTarget: `${E.warning} منشن العضو أو حط الآيدي.`,
    },

    ticket: {
      notATicket: `${E.error} داخل التكت بس.`,
      ticketClosed: `${E.error} التكت مغلق.`,
      claimed: (ticketName: string, points: number) => `${E.success} استلمت \`${ticketName}\`. **${ticketPointsText(points)}**`,
      claimedNoPoint: (ticketName: string) => `${E.success} صرت المسؤول عن \`${ticketName}\`.`,
      closed: (ticketName: string) => `${E.success} تم إغلاق \`${ticketName}\`.`,
      closedWithTranscript: (ticketName: string, transcriptId: string) => `${E.success} تم إغلاق \`${ticketName}\` وحفظ النسخة \`${transcriptId}\`.`,
      willBeDeleted: `${E.warning} بينحذف التكت بعد شوي.`,
      deleted: (ticketName: string) => `${E.success} تم حذف \`${ticketName}\` (السجل محفوظ).`,
      renamed: (name: string) => `${E.success} صار اسم التكت \`${name}\`.`,
      renameUsage: `${E.warning} الطريقة: \`!تغيير-الاسم <الاسم-الجديد>\``,
      transcriptSaved: (transcriptId: string) => `${E.success} تم حفظ النسخة: \`${transcriptId}\`.`,
      addUsage: `${E.warning} الطريقة: \`!اضافة <@عضو|@رتبة> …\``,
      removeUsage: `${E.warning} الطريقة: \`!ازالة <@عضو|@رتبة> …\``,
      nothingToAdd: `${E.warning} منشن عضو أو رتبة للإضافة.`,
      nothingToRemove: `${E.warning} منشن عضو أو رتبة للإزالة.`,
      added: (users: number, roles: number) => `${E.success} تمت إضافة ${users} عضو و ${roles} رتبة.`,
      removed: (count: number, skipped: number) =>
        skipped > 0
          ? `${E.success} تمت إزالة ${count}، وتجاوز ${skipped} محمي (صاحب التكت / المستلم / رتبة الدعم).`
          : `${E.success} تمت إزالة ${count}.`,
      notAllowed: `${E.error} ما تقدر تدير هذا التكت.`,
    },

    modmail: {
      notAThread: `${E.error} \`!انهاء\` داخل ثريد البلاغ بس.`,
      notAllowed: `${E.error} هذا البلاغ مو لك.`,
      alreadyClosed: `${E.error} البلاغ مغلق.`,
      claimFirst: `${E.warning} استلم البلاغ أول.`,
      closed: (caseId: string) => `${E.success} تم إقفال البلاغ \`${caseId}\`.`,
      ended: (caseId: string) => `${E.success} انتهى التحقيق \`${caseId}\` وتم تحديده **RESOLVED**.`,
    },

    staff: {
      rolesNotConfigured: `${E.error} سلّم الطاقم غير مضبوط. حدّد رتبة البداية والنهاية من الداشبورد (الرتب).`,
      memberNotFound: `${E.error} العضو مو موجود في السيرفر.`,
      notStaffMember: (userMention: string) => `${E.error} ${userMention} مو من الطاقم.`,
      levelOutOfRange: (min: number, max: number) => `${E.error} المستوى من ${min} إلى ${max}.`,
      accepted: (userMention: string, level: number) => `${E.success} تم قبول ${userMention} على المستوى **${level}**.`,
      acceptedWithType: (userMention: string, level: number, typeLabel: string) => `${E.success} تم قبول ${userMention} كـ **${typeLabel}**، المستوى **${level}**.`,
      unknownStaffType: (token: string, available: string) => `${E.error} نوع غير معروف \`${token}\`. المتاح: ${available}.`,
      duplicateStaffLevel: `${E.error} حدد مستوى واحد بس.`,
      duplicateStaffType: `${E.error} حدد نوع واحد بس.`,
      duplicateStaffTier: `${E.error} حدد تصنيف واحد بس.`,
      levelAndTier: `${E.error} حدد مستوى أو تصنيف، مو الاثنين.`,
      tierNotConfigured: (tierLabel: string, slug: string) => `${E.error} تصنيف **${tierLabel}** غير مضبوط. شغّل \`/role boundary tier:${slug}\`.`,
      acceptedWithTier: (userMention: string, level: number, tierLabel: string) => `${E.success} تم قبول ${userMention} كـ **${tierLabel}**، المستوى **${level}**.`,
      acceptedWithTierAndType: (userMention: string, level: number, tierLabel: string, typeLabel: string) =>
        `${E.success} تم قبول ${userMention} كـ **${tierLabel}** (${typeLabel})، المستوى **${level}**.`,
      staffTypeRoleMissing: (typeLabel: string, slug: string) => `${E.error} رتبة **${typeLabel}** غير مضبوطة. شغّل \`/role stafftype type:${slug}\`.`,
      fired: (userMention: string) => `${E.success} تم فصل ${userMention} من الطاقم.`,
      blacklisted: (userMention: string) => `${E.success} تم فصل ${userMention} وإضافته للبلاك ليست.`,
      blacklistRoleMissing: `${E.error} رتبة البلاك ليست غير مضبوطة.`,
      promoted: (userMention: string, from: number, to: number) => `${E.success} تمت ترقية ${userMention} **${from} → ${to}**.`,
      demoted: (userMention: string, from: number, to: number) => `${E.success} تم تنزيل ${userMention} **${from} → ${to}**.`,
      alreadyMaxLevel: (userMention: string) => `${E.warning} ${userMention} في أعلى مستوى.`,
      alreadyStaff: (userMention: string) => `${E.warning} ${userMention} من الطاقم أصلاً. استخدم \`!ترقية\` أو \`!تنزيل\`.`,
      promoteTierNotHigher: (userMention: string, tierLabel: string, level: number) => `${E.warning} ${userMention} **${tierLabel}** أو أعلى أصلاً (المستوى ${level}).`,
      demoteTierNotLower: (userMention: string, tierLabel: string, level: number) => `${E.warning} ${userMention} **${tierLabel}** أو أقل أصلاً (المستوى ${level}).`,
      tierTokenUnknown: (token: string, available: string) => `${E.error} \`${token}\` مو عدد مستويات ولا من: ${available}.`,

      backUsage: `${E.warning} الطريقة: \`!back @عضو\``,
      backNoRecord: (userMention: string) => `${E.error} ${userMention} ما له سجل إداري سابق. استخدم \`!قبول\`.`,
      backNothingToDo: (userMention: string) => `${E.warning} ${userMention} من الطاقم ورتبه كاملة.`,
      backBlacklisted: (userMention: string) => `${E.error} ${userMention} في البلاك ليست.`,
      backOnBreak: (userMention: string) => `${E.warning} ${userMention} في بريك. استخدم \`!unbreak\`.`,
      backDone: (userMention: string, level: number) => `${E.success} رجع ${userMention} للطاقم على المستوى **${level}**.`,
      alreadyMinLevel: (userMention: string) => `${E.warning} ${userMention} في أقل مستوى. استخدم \`!فصل\` لإزالته.`,
      acceptUsage: `${E.warning} الطريقة: \`!قبول @عضو [المستوى]\``,
      fireUsage: `${E.warning} الطريقة: \`!فصل @عضو\` · \`!فصل @عضو =\` مع البلاك ليست`,
      promoteUsage: `${E.warning} الطريقة: \`!ترقية @عضو [عدد | high | owner | ship | max]\``,
      demoteUsage: `${E.warning} الطريقة: \`!تنزيل @عضو [عدد | high | owner | ship]\``,
    },

    jail: {
      usage: `${E.warning} الطريقة: \`!سجن @عضو <السبب> [المدة مثل 2h أو 3d، الافتراضي 28 يوم]\` مع إرفاق الدليل.`,
      reasonRequired: `${E.warning} اكتب السبب، أو مدة مثل \`3d\`.`,
      noReason: "بدون سبب",
      durationOutOfRange: `${E.warning} المدة من دقيقة إلى 365 يوم.`,
      jailedFor: (mention: string, reason: string, duration: string, until: Date) =>
        `${E.success} تم سجن ${mention} لمدة **${duration}**. السبب: ${reason}. ينفك ${at(until)}.`,
      proofRequired: `${E.warning} أرفق دليل (صورة) للسجن.`,
      self: `${E.error} ما تقدر تسجن نفسك.`,
      bot: `${E.error} ما تقدر تسجن بوت.`,
      jailed: (mention: string, reason: string) => `${E.success} تم سجن ${mention}. السبب: ${reason}`,
      failed: (reason: string) => `${E.error} ما تم السجن: ${reason}`,
      denied: {
        TARGET_IS_STAFF: `${E.error} ما ينسجن الإداري، عقوباته بالتحذيرات.`,
        TARGET_OUTRANKS_ACTOR: `${E.error} ما تقدر تسجن رتبة مثلك أو أعلى.`,
      } as Record<string, string>,
    },

    unjail: {
      usage: `${E.warning} الطريقة: \`!فك @عضو [السبب]\``,
      notJailed: (mention: string) => `${E.warning} ${mention} مو مسجون.`,
      released: (mention: string) => `${E.success} تم فك سجن ${mention}.`,
      releasedRoleOnly: (mention: string) => `${E.success} تمت إزالة رتبة السجن عن ${mention} (كان مسجون يدوياً، بدون سجل).`,
      roleRemoveFailed: (mention: string, reason: string) => `${E.warning} تم فك سجن ${mention}، بس ما قدرت أشيل الرتبة (${reason}). شيلها يدوياً.`,
      defaultReason: (actorId: string) => `فك سجن بواسطة ${actorId}`,
    },

    warn: {
      userWarnUsage: `${E.warning} الطريقة: \`!تحذير @عضو <السبب>\``,
      reasonRequired: `${E.warning} اكتب سبب التحذير.`,
      noReason: "بدون سبب",
      proofRequired: `${E.warning} أرفق دليل (صورة) لتحذير الإداري.`,
      userWarned: (userMention: string, reason: string) => `${E.warning} تم تحذير ${userMention}. **السبب:** ${reason}`,

      verbalRecorded: (userMention: string, reason: string) => `${E.warning} تحذير شفوي على ${userMention}. **السبب:** ${reason}`,
      convertedToReal: (count: number) => `${E.warning} تحوّلت ${count} تحذيرات شفوية إلى تحذير رسمي.`,
      realRecorded: (userMention: string, level: number) => `${E.warning} ${ordinalWarning(level)} على ${userMention}.`,
      demotedMaxWarnings: (userMention: string, from: number, to: number) => `${E.warning} ${userMention} وصل **3 تحذيرات**: تنزيل **${from} → ${to}** وتصفير التحذيرات.`,
      firedNoLevelLeft: (userMention: string) => `${E.error} ${userMention} وصل **3 تحذيرات** وهو على المستوى 0، فتم فصله.`,
      firedMaxWarnings: (userMention: string) => `${E.error} تم فصل ${userMention} وإضافته للبلاك ليست لوصوله حد التحذيرات.`,

      staffWarnManagerOnly: `${E.error} تحذير الإداريين لمانجرات الطاقم بس.`,
      staffWarnTargetNotStaff: (userMention: string) => `${E.error} ${userMention} مو من الطاقم. استخدم روم تحذيرات الأعضاء.`,
      staffWarnTargetInactive: (userMention: string) => `${E.error} ${userMention} مو إداري نشط.`,
      staffWarnRoleMissing: (level: number) => `${E.error} رتبة تحذير الطاقم ${level} غير مضبوطة.`,

      unwarnUsage: [
        `${E.warning} الطريقة:`,
        "`!الغاء-تحذير @عضو staff` يشيل تحذير الطاقم الحالي",
        "`!الغاء-تحذير @عضو <آيدي-التحذير>` يشيل هذا التحذير",
      ].join("\n"),
      unwarnWarningIdRequired: `${E.warning} حط آيدي التحذير أو \`staff\`: \`!الغاء-تحذير @عضو <staff | آيدي>\``,
      noActiveRealWarning: (userMention: string) => `${E.warning} ${userMention} ما عليه تحذير رسمي نشط.`,
      warningNotFound: `${E.error} ما فيه تحذير بهذا الآيدي.`,
      warningWrongUser: `${E.error} التحذير مو لهذا العضو.`,
      warningAlreadyInactive: `${E.warning} التحذير ملغي أصلاً.`,
      unwarnedUser: (userMention: string) => `${E.success} تم إلغاء تحذير ${userMention}.`,
      unwarnedVerbal: (userMention: string) => `${E.success} تم إلغاء التحذير الشفوي عن ${userMention}.`,
      unwarnedReal: (userMention: string) => `${E.success} تم حذف التحذير الرسمي عن ${userMention} وتحديث رتبة التحذير.`,

      warnsUsage: `${E.warning} الطريقة: \`!تحذيرات <آيدي-التحذير>\``,
      noWarnings: (userMention: string) => `ما فيه تحذيرات على ${userMention}.`,
      warningsHeader: (userMention: string) => `**تحذيرات ${userMention}**`,
      verbalSection: "**الشفوية:**",
      realSection: "**الرسمية:**",
      verbalSummary: (active: number, converted: number) => `${converted} محوَّلة · ${active} نشطة`,
      realSummary: (level: number) => (level > 0 ? ordinalWarning(level) : "ما فيه تحذير رسمي"),
      verbalNone: "ما فيه تحذيرات شفوية.",
      typeLabel: (kind: "VERBAL" | "REAL") => (kind === "VERBAL" ? "شفوي" : "رسمي"),
      levelLabel: (level: number) => ordinalWarning(level),
      convertedStatusLabel: "تحوّل لرسمي",
      userWarnLine: (index: number, id: string, status: string, reason: string) => `\`${index}.\` \`${id}\` · ${status} · ${reason}`,
      staffWarnLine: (index: number, id: string, level: number, status: string, reason: string) => `\`${index}.\` \`${id}\` · **L${level}** · ${status} · ${reason}`,
      privacyDenied: `${E.error} تقدر تشوف تحذيراتك بس.`,
      detailNotAllowed: `${E.error} ما تقدر تشوف هذا التحذير.`,
    },
  },
);
