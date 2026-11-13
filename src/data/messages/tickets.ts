import { emojis } from "../emojis/index.ts";
import { bilingual, currentLang } from "../../shared/utils/lang-context.ts";

const E = emojis;

/** "+2 points" — the amount comes from the guild's ticket-claim value (/points values). */
const ticketPointsText = (points: number) =>
  currentLang() === "en" ? `+${points} point${points === 1 ? "" : "s"}` : `+${points} ${points === 1 ? "نقطة" : "نقاط"}`;

const time = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:f>`;
const relative = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:R>`;
const who = (id: string | null) => (id ? `<@${id}>` : "—");
const people = (users: string[], roles: string[]) =>
  [users.map((u) => `<@${u}>`).join(" "), roles.map((r) => `<@&${r}>`).join(" ")].filter(Boolean).join("\n") || "—";

export const ticketMessages = bilingual(
  {
    setup: {
      deployed: (channelId: string, panelCount: number) => `${E.success} Ticket panel posted in <#${channelId}> (**${panelCount}** sections).`,
      updated: (channelId: string, panelCount: number) => `${E.success} Ticket panel updated in <#${channelId}> (**${panelCount}** sections).`,
      noPanels: `${E.error} No ticket panels are set up.`,
      invalidConfig: (problems: string[]) => [`${E.error} The ticket setup has problems:`, ...problems.map((p) => `• ${p}`)].join("\n"),
      problem: {
        mainChannelMissing: "The main panel hasn't been posted. Post it with `/ticket send`.",
        mainChannelNotText: "The main panel's channel isn't a text channel. Post it again with `/ticket send`.",
        panelSupportRole: (name: string) => `"${name}": its support role is gone. Fix it with \`/ticket setup\`.`,
        panelCategory: (name: string) => `"${name}": no category set. Fix it with \`/ticket setup\`.`,
        panelDuplicateId: (id: string) => `Duplicate panel ID "${id}"`,
        panelTooManyQuestions: (id: string, n: number, max: number) => `"${id}" has ${n} questions; over ${max} uses a multi-page form.`,
      },
    },

    panel: {
      selectPlaceholderFallback: "Choose a section…",
      noneOpen: `${E.warning} No ticket sections are open right now.`,
    },

    create: {
      unknownPanel: `${E.error} This ticket section no longer exists.`,
      alreadyOpen: (channelId: string) => `${E.warning} You already have a ticket open: <#${channelId}>.`,
      created: (channelId: string) => `${E.success} Your ticket is open: <#${channelId}>.`,
      failed: `${E.error} Couldn't open the ticket. Try again or contact staff.`,
      categoryMissing: `${E.error} This section is misconfigured (no category). Staff have been told.`,
      channelHeader: (ticketName: string, panelName: string) => `# ${panelName} · \`${ticketName}\``,
      answersHeading: "### Answers",
      answerLine: (question: string, answer: string) => `**${question}**\n${answer}`,
      openedBy: (userId: string) => `Opened by <@${userId}>`,
    },

    questions: {
      modalTitle: (panelName: string) => `${panelName} — Details`.slice(0, 45),
      continueTitle: "More questions",
      continueButton: "Continue",
      pageIndicator: (page: number, total: number) => `Step ${page} of ${total}`,
      expired: `${E.error} The form expired. Open a new ticket and try again.`,
    },

    claim: {
      notEligible: `${E.error} You can't claim tickets in this section.`,
      cantClaimOwn: `${E.error} You can't claim your own ticket.`,
      managerCannotClaim: `${E.error} Ticket managers don't claim tickets; the support team does.`,
      notOpen: `${E.error} This ticket can't be claimed anymore.`,
      alreadyClaimed: (userId: string) => `${E.error} Already claimed by <@${userId}>.`,
      success: (ticketName: string, points: number) => `${E.success} Claimed \`${ticketName}\`. **${ticketPointsText(points)}**`,
      successNoPoint: (ticketName: string) => `${E.success} You're now handling \`${ticketName}\`.`,
      threadNote: (userMention: string) => `${E.staff} Claimed by ${userMention}.`,
    },

    roleClaim: {
      waiting: (roleId: string) => `<@&${roleId}> added to the ticket. Waiting for someone to take it.`,
      claimedBy: (userId: string) => `Taken by <@${userId}>.`,
      button: "Take request",
      notRoleMember: `${E.error} This button is for members of the added role.`,
      slotGone: `${E.error} That role is no longer on this ticket.`,
      slotClosed: `${E.warning} Someone already took this request.`,
    },

    blacklist: {
      blocked: `${E.error} You're blacklisted from this ticket type.`,
    },

    ticketButtons: {
      claim: "Claim",
      options: "Options",
    },

    options: {
      title: "**Ticket options**",
      closeButton: "Close",
      addUserButton: "Add member",
      removeUserButton: "Remove member",
      renameButton: "Rename",
      transferButton: "Transfer",
      notAllowed: `${E.error} Claim the ticket first to manage it.`,
    },

    transfer: {
      usage: `${E.warning} Usage: \`!handover @member reason\``,
      modalTitle: "Transfer ticket",
      targetLabel: "Transfer to",
      reasonLabel: "Reason",
      reasonPlaceholder: "Why are you transferring it?",

      notTransferable: `${E.error} This section doesn't allow transfers.`,
      notClaimed: `${E.error} The ticket must be claimed first.`,
      notAllowed: `${E.error} Only the claimer can transfer this ticket.`,
      targetMissing: `${E.error} Choose one member.`,
      reasonMissing: `${E.error} A reason is required.`,
      targetNotInGuild: `${E.error} That member isn't in the server.`,
      targetIsBot: `${E.error} You can't transfer to a bot.`,
      targetIsClaimer: `${E.error} They already have this ticket.`,
      targetIsOwner: `${E.error} You can't transfer to the ticket owner.`,
      targetNotStaff: `${E.error} The member must be staff or an admin.`,
      raced: `${E.error} The claimer just changed. Open the options again.`,

      done: (ticketName: string, userId: string, points: number) => `${E.success} \`${ticketName}\` transferred to <@${userId}>. **${ticketPointsText(points)}**`,
      doneNoPoint: (ticketName: string, userId: string) => `${E.success} \`${ticketName}\` transferred to <@${userId}>.`,
      dmFailed: (userId: string) => `${E.warning} Couldn't DM <@${userId}> (DMs closed).`,
      channelNote: (fromUserId: string, toUserId: string, reason: string) => `${E.transfer} Transferred from <@${fromUserId}> to <@${toUserId}>. **Reason:** ${reason}`,

      dm: {
        body: (ticketName: string, reason: string) => `Ticket \`${ticketName}\` was transferred to you. Please head there now.\nReason: ${reason}`,
        button: "Go to ticket",
      },
    },

    renameTicket: {
      modalTitle: "Rename ticket",
      nameLabel: "New name",
      namePlaceholder: "The ticket's new name",
      done: (name: string) => `${E.success} Renamed to \`${name}\`.`,
    },

    addUser: {
      modalTitle: "Add to ticket",
      usersLabel: "Members to add",
      rolesLabel: "Roles to add",
      nothingSelected: `${E.error} Choose at least one member or role.`,
      done: (users: number, roles: number) => `${E.success} Added ${users} member(s) and ${roles} role(s).`,
    },

    removeUser: {
      modalTitle: "Remove from ticket",
      selectLabel: "Who to remove",
      selectPlaceholder: "Choose added members or roles",
      nothingToRemove: `${E.error} Nobody has been added to remove.`,
      nothingSelected: `${E.error} Choose at least one.`,
      protectedSkipped: `${E.warning} The owner, claimer and support role can't be removed and were skipped.`,
      done: (count: number) => `${E.success} Removed ${count}.`,
    },

    info: {
      adminOnly: `${E.error} \`!ticket\` is for admins only.`,
      usage: `${E.warning} Usage: \`!ticket <number>\` (e.g. \`!ticket 12\`), a ticket channel ID or mention, or just \`!ticket\` inside one.`,
      notFound: (ref: string) => `${E.error} No ticket \`${ref.replace(/`/g, "")}\`.`,
      title: (ticketName: string, panel: string) => `## 🎫 ${ticketName} — ${panel}`,
      statuses: {
        OPEN: "🟢 Open, unclaimed",
        CLAIMED: "🔵 Claimed",
        CLOSING: "🟡 Closing",
        CLOSED: "🔒 Closed",
        DELETED: "🗑️ Deleted",
      } as Record<string, string>,
      status: (label: string) => `**Status:** ${label}`,
      openedBy: (userId: string, at: Date) => `**Opened by:** <@${userId}> — ${time(at)}`,
      answersHeading: "### Answers",
      answer: (question: string, answer: string) => `**${question}**\n${answer || "—"}`,
      claimHeading: "### Claim",
      claimedBy: (userId: string, at: Date | null) => `**Claimed by:** <@${userId}>${at ? ` — ${time(at)}` : ""}`,
      firstClaimedBy: (userId: string, at: Date | null) => `**First claimed by:** <@${userId}>${at ? ` — ${time(at)}` : ""}`,
      handover: (from: string, at: Date, reason: string | null) => `**Last transfer:** from <@${from}> — ${time(at)}${reason ? `\n-# Reason: ${reason}` : ""}`,
      unclaimed: "Not claimed yet.",
      peopleHeading: "### Added members and roles",
      people,
      sleeping: (by: string | null, due: Date) => `**Waiting for the member** (${who(by)}) — closes ${relative(due)}`,
      closed: (by: string | null, at: Date) => `**Closed by:** ${who(by)} — ${time(at)}`,
      reopened: (by: string | null, at: Date) => `**Reopened by:** ${who(by)} — ${time(at)}`,
      transcript: (id: string) => `**Transcript:** \`${id}\``,
      historyHeading: "### History",
      commandsHeading: "### Commands used",
      historyRow: (at: Date, label: string, actorId: string, extra: string) => `-# ${relative(at)} — ${label} — <@${actorId}>${extra ? ` ${extra}` : ""}`,
      commandRow: (at: Date, actorId: string, command: string) => `-# ${relative(at)} — <@${actorId}>: \`${command.replace(/`/g, "ˋ").slice(0, 120)}\``,
      none: "-# Nothing.",
      olderHidden: (n: number) => `-# … and ${n} older.`,
    },

    claimerOffDuty: {
      title: (staffId: string, onBreak: boolean) =>
        onBreak ? `### ${E.warning} Claimer <@${staffId}> is on a break` : `### ${E.warning} Claimer <@${staffId}> is no longer staff`,
      body: "The ticket is open again. Someone please claim it.",
      movedTo: (claimerId: string) => `The ticket is now with <@${claimerId}>.`,
      rolesPing: (roleIds: readonly string[]) => roleIds.map((id) => `<@&${id}>`).join(" "),
      claimButton: "Claim ticket",
      reasonFired: "Removed from staff",
      reasonBreak: "On a break",
    },

    memberLeft: {
      title: (userId: string) => `### ${E.warning} Ticket owner <@${userId}> left the server`,
      question: "Close the ticket?",
      claimerPing: (claimerId: string) => `-# <@${claimerId}>`,
      closeButton: "Close ticket",
    },

    close: {
      confirming: (ticketName: string, seconds: number) => `${E.warning} Closing \`${ticketName}\` in ${seconds}s…`,
      done: (ticketName: string) => `${E.success} Closed \`${ticketName}\`.`,
      withTranscript: (ticketName: string) => `${E.success} Closed \`${ticketName}\`. Transcript saved.`,
      channelWillDelete: `${E.warning} This ticket will be deleted shortly.`,
      notAllowed: `${E.error} You can't close this ticket.`,
    },

    closedPanel: {
      heading: (ticketName: string) => `## ${E.lock} \`${ticketName}\` closed`,
      closedBy: (userId: string) => `**Closed by:** <@${userId}>`,
      closedAt: (date: Date) => `**Closed:** <t:${Math.floor(date.getTime() / 1000)}:F>`,
      owner: (userId: string) => `**Owner:** <@${userId}>`,
      handler: (userId: string) => `**Claimer:** <@${userId}>`,
      handlerNone: "**Claimer:** —",
      transcriptSaved: (transcriptId: string) => `**Transcript:** \`${transcriptId}\``,
      transcriptNone: "**Transcript:** —",
      hint: "-# The channel stays for review. Use the buttons below or `!delete`.",
      buttons: {
        transcript: "Transcript",
        delete: "Delete channel",
        reopen: "Reopen",
      },
      notAllowed: `${E.error} You can't manage this closed ticket.`,
      notClosed: `${E.error} This ticket isn't closed.`,
      transcriptUnavailable: `${E.error} No transcript is available for this ticket.`,
      transcriptReady: (ticketName: string) => `${E.success} Transcript of \`${ticketName}\`:`,
      deleting: `${E.warning} Deleting the channel…`,
    },

    reopen: {
      done: (ticketName: string) => `${E.success} Reopened \`${ticketName}\`.`,
      channelNote: (userId: string) => `${E.success} Reopened by <@${userId}>.`,
      raced: `${E.error} The ticket just changed. Try again.`,
    },

    sleep: {
      usage: `${E.warning} Usage: \`!sleep [duration]\`, e.g. \`!sleep 6h\` or \`!sleep 30m\`.`,
      notAllowed: `${E.error} Only this section's staff or the claimer can do this.`,
      notOpen: `${E.error} This ticket isn't open.`,
      invalidDuration: (min: string, max: string) => `${E.error} Use a duration like \`6h\` or \`30m\`, between ${min} and ${max}.`,
      alreadySleeping: (dueAt: Date) => `${E.warning} Already waiting for the member. Closes ${relative(dueAt)}.`,
      started: (duration: string, dueAt: Date) => `${E.success} Owner notified. Closes in **${duration}** (${relative(dueAt)}) if they don't reply.`,
      dmFailed: (userId: string) => `${E.warning} Couldn't DM <@${userId}> (DMs closed). The notice is in the channel.`,
      channelNote: (userId: string, duration: string) => `${E.loading} <@${userId}>, this ticket closes in **${duration}** if you don't reply.`,
      cancelled: (userId: string) => `${E.success} <@${userId}> replied. Auto-close cancelled.`,
      autoClosed: `${E.lock} Closed automatically: no reply in time.`,
      dm: {
        body: (duration: string) => `Your ticket closes in ${duration} if you don't reply. Please reply there now.`,
        button: "Go to ticket",
      },
    },

    common: {
      notATicket: `${E.error} This isn't a ticket channel.`,
      ticketGone: `${E.error} This ticket no longer exists.`,
      wrongGuild: `${E.error} This ticket belongs to another server.`,
      genericError: `${E.error} Something went wrong. Try again.`,
    },

    log: {
      titleCreated: `${E.report} Ticket opened`,
      titleClaimed: `${E.staff} Ticket claimed`,
      titleTransferred: `${E.transfer} Ticket transferred`,
      titleUnclaimed: `${E.warning} Ticket unclaimed`,
      titleSleep: `${E.loading} Waiting for member`,
      titleSleepCancelled: `${E.success} Member replied`,
      titleRenamed: "✏️ Ticket renamed",
      titleClosed: "🔒 Ticket closed",
      titleReopened: `${E.success} Ticket reopened`,
      titleDeleted: `${E.error} Ticket deleted`,
      titleDeletedManually: `${E.warning} Ticket channel deleted by hand`,
      titleUserAdded: `${E.user} Member added`,
      titleUserRemoved: `${E.user} Member removed`,
      titleRoleAdded: `${E.staff} Role added`,
      titleRoleRemoved: `${E.staff} Role removed`,
      ticket: "Ticket",
      panel: "Section",
      actor: "By",
      duration: "Duration",
      closesAt: "Closes",
      newName: "New name",
      member: "Member",
      role: "Role",
      from: "From",
      to: "To",
      reason: "Reason",
      deletedBy: "Deleted by",
      unknownActor: "Unknown",
      manualNote: "The channel was deleted outside the bot. The transcript was saved.",
    },

    faq: {
      added: (question: string) => `${E.success} FAQ added: **${question}**`,
      removed: (question: string) => `${E.success} FAQ removed: **${question}**`,
      notFound: `${E.error} That FAQ doesn't exist.`,
      empty: "No FAQs yet.",
      listTitle: "**FAQ**",
      listLine: (index: number, question: string, scope: string) => `${index}. ${question} — ${scope}`,
      scopeAll: "All sections",
      modalTitle: "Add FAQ",
      questionLabel: "Question",
      questionPlaceholder: "How do I change my password?",
      answerLabel: "Answer",
      answerPlaceholder: "Go to Settings → Security → Change password…",
      selectPlaceholder: "Browse FAQs",
      bothRequired: `${E.error} Both a question and an answer are needed.`,
      assigned: (question: string, scope: string) => `${E.success} FAQ **${question}** now shows in: ${scope}.`,
      unknownPanel: `${E.error} That section doesn't exist.`,
    },
  },
  {
    setup: {
      deployed: (channelId: string, panelCount: number) => `${E.success} تم نشر لوحة التكتات في <#${channelId}> (**${panelCount}** قسم).`,
      updated: (channelId: string, panelCount: number) => `${E.success} تم تحديث لوحة التكتات في <#${channelId}> (**${panelCount}** قسم).`,
      noPanels: `${E.error} ما فيه لوحات تكتات مضبوطة.`,
      invalidConfig: (problems: string[]) => [`${E.error} إعدادات التكتات فيها مشاكل:`, ...problems.map((p) => `• ${p}`)].join("\n"),
      problem: {
        mainChannelMissing: "اللوحة الرئيسية ما انرسلت. انشرها بـ `/ticket send`.",
        mainChannelNotText: "روم اللوحة الرئيسية مو نصي. انشرها من جديد بـ `/ticket send`.",
        panelSupportRole: (name: string) => `"${name}": رتبة الدعم ما عادت موجودة. اضبطها بـ \`/ticket setup\`.`,
        panelCategory: (name: string) => `"${name}": الكاتيقوري غير مضبوط. اضبطه بـ \`/ticket setup\`.`,
        panelDuplicateId: (id: string) => `آيدي لوحة مكرر "${id}"`,
        panelTooManyQuestions: (id: string, n: number, max: number) => `"${id}" فيها ${n} أسئلة؛ أكثر من ${max} تصير نموذج متعدد الصفحات.`,
      },
    },

    panel: {
      selectPlaceholderFallback: "اختر قسم…",
      noneOpen: `${E.warning} ما فيه أقسام مفتوحة حالياً.`,
    },

    create: {
      unknownPanel: `${E.error} هذا القسم ما عاد موجود.`,
      alreadyOpen: (channelId: string) => `${E.warning} عندك تكت مفتوح: <#${channelId}>.`,
      created: (channelId: string) => `${E.success} تم فتح تكتك: <#${channelId}>.`,
      failed: `${E.error} ما قدرت أفتح التكت. جرّب مرة ثانية أو كلّم الطاقم.`,
      categoryMissing: `${E.error} القسم فيه خطأ إعداد (الكاتيقوري ناقص). تم إبلاغ الطاقم.`,
      channelHeader: (ticketName: string, panelName: string) => `# ${panelName} · \`${ticketName}\``,
      answersHeading: "### الإجابات",
      answerLine: (question: string, answer: string) => `**${question}**\n${answer}`,
      openedBy: (userId: string) => `فتحه <@${userId}>`,
    },

    questions: {
      modalTitle: (panelName: string) => `${panelName} — التفاصيل`.slice(0, 45),
      continueTitle: "أسئلة إضافية",
      continueButton: "متابعة",
      pageIndicator: (page: number, total: number) => `الخطوة ${page} من ${total}`,
      expired: `${E.error} انتهت صلاحية النموذج. افتح تكت جديد.`,
    },

    claim: {
      notEligible: `${E.error} ما تقدر تستلم تكتات هذا القسم.`,
      cantClaimOwn: `${E.error} ما تقدر تستلم تكتك.`,
      managerCannotClaim: `${E.error} مسؤولين التكتات ما يستلمون، الاستلام لفريق الدعم.`,
      notOpen: `${E.error} التكت ما عاد يُستلم.`,
      alreadyClaimed: (userId: string) => `${E.error} مستلَم من <@${userId}>.`,
      success: (ticketName: string, points: number) => `${E.success} استلمت \`${ticketName}\`. **${ticketPointsText(points)}**`,
      successNoPoint: (ticketName: string) => `${E.success} صرت المسؤول عن \`${ticketName}\`.`,
      threadNote: (userMention: string) => `${E.staff} استلمه ${userMention}.`,
    },

    roleClaim: {
      waiting: (roleId: string) => `تمت إضافة <@&${roleId}> للتكت، بانتظار من يستلم الطلب.`,
      claimedBy: (userId: string) => `استلمه <@${userId}>.`,
      button: "استلام الطلب",
      notRoleMember: `${E.error} الزر لأعضاء الرتبة المضافة بس.`,
      slotGone: `${E.error} الرتبة ما عادت مضافة لهذا التكت.`,
      slotClosed: `${E.warning} الطلب مستلَم.`,
    },

    blacklist: {
      blocked: `${E.error} أنت في البلاك ليست لهذا النوع من التكتات.`,
    },

    ticketButtons: {
      claim: "استلام",
      options: "خيارات",
    },

    options: {
      title: "**خيارات التكت**",
      closeButton: "إغلاق",
      addUserButton: "إضافة عضو",
      removeUserButton: "إزالة عضو",
      renameButton: "تغيير الاسم",
      transferButton: "تحويل",
      notAllowed: `${E.error} استلم التكت أول عشان تديره.`,
    },

    transfer: {
      usage: `${E.warning} الطريقة: \`!handover @العضو السبب\``,
      modalTitle: "تحويل التكت",
      targetLabel: "التحويل إلى",
      reasonLabel: "السبب",
      reasonPlaceholder: "ليش تحوّل التكت؟",

      notTransferable: `${E.error} هذا القسم ما يسمح بالتحويل.`,
      notClaimed: `${E.error} لازم يكون التكت مستلَم أول.`,
      notAllowed: `${E.error} التحويل للمستلِم بس.`,
      targetMissing: `${E.error} اختر عضو واحد.`,
      reasonMissing: `${E.error} السبب مطلوب.`,
      targetNotInGuild: `${E.error} العضو مو موجود في السيرفر.`,
      targetIsBot: `${E.error} ما ينحوّل التكت لبوت.`,
      targetIsClaimer: `${E.error} التكت عنده أصلاً.`,
      targetIsOwner: `${E.error} ما ينحوّل لصاحب التكت.`,
      targetNotStaff: `${E.error} لازم يكون من الطاقم أو أدمن.`,
      raced: `${E.error} تغيّر المستلِم قبل شوي. افتح الخيارات من جديد.`,

      done: (ticketName: string, userId: string, points: number) => `${E.success} تم تحويل \`${ticketName}\` إلى <@${userId}>. **${ticketPointsText(points)}**`,
      doneNoPoint: (ticketName: string, userId: string) => `${E.success} تم تحويل \`${ticketName}\` إلى <@${userId}>.`,
      dmFailed: (userId: string) => `${E.warning} ما قدرت أراسل <@${userId}> (الخاص مقفل).`,
      channelNote: (fromUserId: string, toUserId: string, reason: string) => `${E.transfer} تم التحويل من <@${fromUserId}> إلى <@${toUserId}>. **السبب:** ${reason}`,

      dm: {
        body: (ticketName: string, reason: string) => `تم تحويل التكت \`${ticketName}\` لك، توجّه له الحين.\nالسبب: ${reason}`,
        button: "الذهاب للتكت",
      },
    },

    renameTicket: {
      modalTitle: "تغيير اسم التكت",
      nameLabel: "الاسم الجديد",
      namePlaceholder: "اسم التكت الجديد",
      done: (name: string) => `${E.success} صار اسم التكت \`${name}\`.`,
    },

    addUser: {
      modalTitle: "إضافة للتكت",
      usersLabel: "الأعضاء",
      rolesLabel: "الرتب",
      nothingSelected: `${E.error} اختر عضو أو رتبة على الأقل.`,
      done: (users: number, roles: number) => `${E.success} تمت إضافة ${users} عضو و ${roles} رتبة.`,
    },

    removeUser: {
      modalTitle: "إزالة من التكت",
      selectLabel: "مين تشيل",
      selectPlaceholder: "اختر من الأعضاء/الرتب المضافة",
      nothingToRemove: `${E.error} ما فيه أحد مضاف.`,
      nothingSelected: `${E.error} اختر واحد على الأقل.`,
      protectedSkipped: `${E.warning} صاحب التكت والمستلِم ورتبة الدعم ما ينشالون وتم تجاوزهم.`,
      done: (count: number) => `${E.success} تمت إزالة ${count}.`,
    },

    info: {
      adminOnly: `${E.error} \`!ticket\` للأدمن بس.`,
      usage: `${E.warning} الطريقة: \`!ticket <رقم>\` (مثل \`!ticket 12\`)، أو آيدي/منشن روم التكت، أو \`!ticket\` داخل التكت.`,
      notFound: (ref: string) => `${E.error} ما لقيت تكت \`${ref.replace(/`/g, "")}\`.`,
      title: (ticketName: string, panel: string) => `## 🎫 ${ticketName} — ${panel}`,
      statuses: {
        OPEN: "🟢 مفتوح، غير مستلَم",
        CLAIMED: "🔵 مستلَم",
        CLOSING: "🟡 جاري الإغلاق",
        CLOSED: "🔒 مغلق",
        DELETED: "🗑️ محذوف",
      } as Record<string, string>,
      status: (label: string) => `**الحالة:** ${label}`,
      openedBy: (userId: string, at: Date) => `**فتحه:** <@${userId}> — ${time(at)}`,
      answersHeading: "### الإجابات",
      answer: (question: string, answer: string) => `**${question}**\n${answer || "—"}`,
      claimHeading: "### الاستلام",
      claimedBy: (userId: string, at: Date | null) => `**المستلِم:** <@${userId}>${at ? ` — ${time(at)}` : ""}`,
      firstClaimedBy: (userId: string, at: Date | null) => `**أول مستلِم:** <@${userId}>${at ? ` — ${time(at)}` : ""}`,
      handover: (from: string, at: Date, reason: string | null) => `**آخر تحويل:** من <@${from}> — ${time(at)}${reason ? `\n-# السبب: ${reason}` : ""}`,
      unclaimed: "ما استلمه أحد للحين.",
      peopleHeading: "### الأعضاء والرتب المضافة",
      people,
      sleeping: (by: string | null, due: Date) => `**بانتظار رد العضو** (${who(by)}) — يقفل ${relative(due)}`,
      closed: (by: string | null, at: Date) => `**قفله:** ${who(by)} — ${time(at)}`,
      reopened: (by: string | null, at: Date) => `**أعاد فتحه:** ${who(by)} — ${time(at)}`,
      transcript: (id: string) => `**النسخة:** \`${id}\``,
      historyHeading: "### السجل",
      commandsHeading: "### الأوامر المستخدمة",
      historyRow: (at: Date, label: string, actorId: string, extra: string) => `-# ${relative(at)} — ${label} — <@${actorId}>${extra ? ` ${extra}` : ""}`,
      commandRow: (at: Date, actorId: string, command: string) => `-# ${relative(at)} — <@${actorId}>: \`${command.replace(/`/g, "ˋ").slice(0, 120)}\``,
      none: "-# لا شيء.",
      olderHidden: (n: number) => `-# … و ${n} أقدم.`,
    },

    claimerOffDuty: {
      title: (staffId: string, onBreak: boolean) =>
        onBreak ? `### ${E.warning} المستلِم <@${staffId}> في بريك` : `### ${E.warning} المستلِم <@${staffId}> ما عاد من الطاقم`,
      body: "رجع التكت مفتوح، أحد يستلمه.",
      movedTo: (claimerId: string) => `صار التكت عند <@${claimerId}>.`,
      rolesPing: (roleIds: readonly string[]) => roleIds.map((id) => `<@&${id}>`).join(" "),
      claimButton: "استلام التكت",
      reasonFired: "مفصول من الطاقم",
      reasonBreak: "في بريك",
    },

    memberLeft: {
      title: (userId: string) => `### ${E.warning} صاحب التكت <@${userId}> طلع من السيرفر`,
      question: "تقفل التكت؟",
      claimerPing: (claimerId: string) => `-# <@${claimerId}>`,
      closeButton: "إغلاق التكت",
    },

    close: {
      confirming: (ticketName: string, seconds: number) => `${E.warning} إغلاق \`${ticketName}\` خلال ${seconds} ثواني…`,
      done: (ticketName: string) => `${E.success} تم إغلاق \`${ticketName}\`.`,
      withTranscript: (ticketName: string) => `${E.success} تم إغلاق \`${ticketName}\` وحفظ النسخة.`,
      channelWillDelete: `${E.warning} بينحذف التكت بعد شوي.`,
      notAllowed: `${E.error} ما تقدر تغلق هذا التكت.`,
    },

    closedPanel: {
      heading: (ticketName: string) => `## ${E.lock} تم إغلاق \`${ticketName}\``,
      closedBy: (userId: string) => `**أغلقه:** <@${userId}>`,
      closedAt: (date: Date) => `**وقت الإغلاق:** <t:${Math.floor(date.getTime() / 1000)}:F>`,
      owner: (userId: string) => `**صاحب التكت:** <@${userId}>`,
      handler: (userId: string) => `**المستلِم:** <@${userId}>`,
      handlerNone: "**المستلِم:** —",
      transcriptSaved: (transcriptId: string) => `**النسخة:** \`${transcriptId}\``,
      transcriptNone: "**النسخة:** —",
      hint: "-# الروم باقي للمراجعة. استخدم الأزرار أو `!delete`.",
      buttons: {
        transcript: "النسخة",
        delete: "حذف الروم",
        reopen: "إعادة فتح",
      },
      notAllowed: `${E.error} ما تقدر تدير هذا التكت المغلق.`,
      notClosed: `${E.error} التكت مو مغلق.`,
      transcriptUnavailable: `${E.error} ما فيه نسخة متاحة لهذا التكت.`,
      transcriptReady: (ticketName: string) => `${E.success} نسخة \`${ticketName}\`:`,
      deleting: `${E.warning} جاري حذف الروم…`,
    },

    reopen: {
      done: (ticketName: string) => `${E.success} تمت إعادة فتح \`${ticketName}\`.`,
      channelNote: (userId: string) => `${E.success} أعاد فتحه <@${userId}>.`,
      raced: `${E.error} تغيّرت حالة التكت قبل شوي. جرّب مرة ثانية.`,
    },

    sleep: {
      usage: `${E.warning} الطريقة: \`!sleep [المدة]\` مثل \`!sleep 6h\` أو \`!sleep 30m\`.`,
      notAllowed: `${E.error} لإداريي القسم أو المستلِم بس.`,
      notOpen: `${E.error} التكت مو مفتوح.`,
      invalidDuration: (min: string, max: string) => `${E.error} استخدم مدة مثل \`6h\` أو \`30m\`، بين ${min} و ${max}.`,
      alreadySleeping: (dueAt: Date) => `${E.warning} بانتظار رد العضو أصلاً. يقفل ${relative(dueAt)}.`,
      started: (duration: string, dueAt: Date) => `${E.success} تم تنبيه صاحب التكت. يقفل بعد **${duration}** (${relative(dueAt)}) إذا ما رد.`,
      dmFailed: (userId: string) => `${E.warning} ما قدرت أراسل <@${userId}> (الخاص مقفل). التنبيه في الروم.`,
      channelNote: (userId: string, duration: string) => `${E.loading} <@${userId}>، التكت يقفل بعد **${duration}** إذا ما رديت.`,
      cancelled: (userId: string) => `${E.success} رد <@${userId}>، وانلغى الإقفال التلقائي.`,
      autoClosed: `${E.lock} انقفل تلقائياً: ما وصل رد بالوقت.`,
      dm: {
        body: (duration: string) => `تكتك يقفل خلال ${duration} إذا ما رديت. رد عليه الحين.`,
        button: "الذهاب للتكت",
      },
    },

    common: {
      notATicket: `${E.error} هذا مو روم تكت.`,
      ticketGone: `${E.error} التكت ما عاد موجود.`,
      wrongGuild: `${E.error} التكت تابع لسيرفر ثاني.`,
      genericError: `${E.error} صار خطأ، جرّب مرة ثانية.`,
    },

    log: {
      titleCreated: `${E.report} فتح تكت`,
      titleClaimed: `${E.staff} استلام تكت`,
      titleTransferred: `${E.transfer} تحويل تكت`,
      titleUnclaimed: `${E.warning} انسحاب استلام`,
      titleSleep: `${E.loading} بانتظار رد العضو`,
      titleSleepCancelled: `${E.success} رد العضو`,
      titleRenamed: "✏️ تغيير اسم تكت",
      titleClosed: "🔒 إغلاق تكت",
      titleReopened: `${E.success} إعادة فتح تكت`,
      titleDeleted: `${E.error} حذف تكت`,
      titleDeletedManually: `${E.warning} حذف روم تكت يدوياً`,
      titleUserAdded: `${E.user} إضافة عضو`,
      titleUserRemoved: `${E.user} إزالة عضو`,
      titleRoleAdded: `${E.staff} إضافة رتبة`,
      titleRoleRemoved: `${E.staff} إزالة رتبة`,
      ticket: "التكت",
      panel: "القسم",
      actor: "بواسطة",
      duration: "المدة",
      closesAt: "يقفل",
      newName: "الاسم الجديد",
      member: "العضو",
      role: "الرتبة",
      from: "من",
      to: "إلى",
      reason: "السبب",
      deletedBy: "حذفه",
      unknownActor: "غير معروف",
      manualNote: "انحذف الروم من برا البوت، وتم حفظ النسخة.",
    },

    faq: {
      added: (question: string) => `${E.success} تمت إضافة FAQ: **${question}**`,
      removed: (question: string) => `${E.success} تم حذف FAQ: **${question}**`,
      notFound: `${E.error} الـ FAQ هذا مو موجود.`,
      empty: "ما فيه FAQ للحين.",
      listTitle: "**FAQ**",
      listLine: (index: number, question: string, scope: string) => `${index}. ${question} — ${scope}`,
      scopeAll: "كل الأقسام",
      modalTitle: "إضافة FAQ",
      questionLabel: "السؤال",
      questionPlaceholder: "كيف أغيّر كلمة السر؟",
      answerLabel: "الإجابة",
      answerPlaceholder: "الإعدادات ← الأمان ← تغيير كلمة السر…",
      selectPlaceholder: "تصفّح الأسئلة الشائعة",
      bothRequired: `${E.error} السؤال والإجابة مطلوبين.`,
      assigned: (question: string, scope: string) => `${E.success} FAQ **${question}** يظهر في: ${scope}.`,
      unknownPanel: `${E.error} القسم مو موجود.`,
    },
  },
);
