import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const warnPanelMessages = bilingual(
  {
    panel: {
      title: "## Punishments and warnings",
      body: ["Choose an action below; a form asks for the member, reason and proof.", "Every action is saved and sent to the warnings log."],
      footer: "Permissions are checked when you send, not when the panel opens.",
      selectPlaceholder: "Choose an action",
      options: {
        timeout: { label: "Timeout member", description: "Time out a member for a set time" },
        jail: { label: "Jail member", description: "Give the member the jail role" },
        userWarn: { label: "Warn member", description: "Warn a regular member (not staff)" },
        staffWarn: { label: "Warn staff", description: "Warn a staff member, within your permissions" },
      },
    },

    setup: {
      channelNotConfigured: `${E.error} The punishments panel channel isn't set (dashboard → Channels).`,
      channelUnavailable: `${E.error} I can't reach the panel channel. Check it exists and I can send there.`,
      deployed: (channelId: string) => `Punishments panel posted in <#${channelId}>.`,
      updated: (channelId: string) => `Punishments panel updated in <#${channelId}>.`,
    },

    modal: {
      timeoutTitle: "Timeout member",
      jailTitle: "Jail member",
      userWarnTitle: "Warn member",
      staffWarnTitle: "Warn staff",
      user: { label: "Member", placeholder: "Choose the member" },
      reason: { label: "Reason", placeholder: "Why this action?" },
      evidence: { label: "Proof", description: (max: number) => `Upload one or more images (up to ${max}).` },
      duration: { label: "Duration", placeholder: "e.g. 5m · 30m · 1h · 6h · 1d · 7d" },
      verbal: { label: "Verbal warning", description: "Tick for a verbal warning; 3 verbal become an official one." },
    },

    errors: {
      notStaff: `${E.error} Staff only.`,
      unknownAction: `${E.error} Unknown action.`,
      userRequired: `${E.error} Choose a member.`,
      reasonRequired: `${E.error} Give a reason.`,
      evidenceRequired: `${E.error} Upload at least one proof.`,
      targetIsSelf: `${E.error} You can't do this to yourself.`,
      targetIsBot: `${E.error} You can't do this to a bot.`,
      targetLeft: `${E.error} They're no longer in the server.`,
      durationRequired: `${E.error} Give a duration.`,
      durationInvalid: `${E.error} Invalid duration. Use \`30m\`, \`6h\` or \`3d\`.`,
      durationTooShort: (min: string) => `${E.error} The shortest timeout is ${min}.`,
      durationTooLong: (max: string) => `${E.error} Discord allows timeouts up to ${max}.`,
      timeoutFailed: (reason: string) => `${E.error} Timeout failed: ${reason}`,
      jailFailed: (reason: string) => `${E.error} Jail failed: ${reason}`,
      jailDenied: {
        TARGET_IS_STAFF: `${E.error} Staff can't be jailed. Use staff warnings instead.`,
        TARGET_OUTRANKS_ACTOR: `${E.error} You can't jail someone at or above your rank.`,
      } as Record<string, string>,
      inFlight: `${E.warning} Another action on this member is running. Try again in a few seconds.`,
      crashed: `${E.error} Something went wrong; nothing was done.`,
    },

    success: {
      timeout: (mention: string, duration: string) => `${E.success} ${mention} timed out for **${duration}**.`,
      jail: (mention: string) => `${E.success} ${mention} jailed.`,
      userWarn: (mention: string) => `${E.success} ${mention} warned.`,
      staffWarnVerbal: (mention: string) => `${E.success} Verbal warning for ${mention}.`,
      staffWarnReal: (mention: string, level: number) => `${E.success} **Official warning ${level}** for ${mention}.`,
      convertedToReal: (count: number) => `${E.warning} ${count} verbal warnings turned into an official one.`,
      demoted: (mention: string, from: number, to: number) => `${E.warning} ${mention} hit **3 warnings**: demoted **${from} → ${to}**, warnings reset.`,
      fired: (mention: string) => `${E.error} ${mention} hit **3 warnings** at level 0 and was removed from staff.`,
    },
  },
  {
    panel: {
      title: "## العقوبات والتحذيرات",
      body: ["اختر الإجراء تحت؛ بيطلب منك نموذج العضو والسبب والدليل.", "كل إجراء ينحفظ وينرسل للوق التحذيرات."],
      footer: "الصلاحيات تتفحص وقت الإرسال، مو وقت فتح اللوحة.",
      selectPlaceholder: "اختر الإجراء",
      options: {
        timeout: { label: "تايم أوت عضو", description: "تايم أوت لمدة محددة" },
        jail: { label: "سجن عضو", description: "إعطاء رتبة السجن" },
        userWarn: { label: "تحذير عضو", description: "تحذير عضو عادي (مو إداري)" },
        staffWarn: { label: "تحذير إداري", description: "تحذير إداري حسب صلاحياتك" },
      },
    },

    setup: {
      channelNotConfigured: `${E.error} روم لوحة العقوبات غير مضبوط (الداشبورد ← الرومات).`,
      channelUnavailable: `${E.error} ما أقدر أوصل لروم اللوحة. تأكد إنه موجود وأقدر أرسل فيه.`,
      deployed: (channelId: string) => `تم نشر لوحة العقوبات في <#${channelId}>.`,
      updated: (channelId: string) => `تم تحديث لوحة العقوبات في <#${channelId}>.`,
    },

    modal: {
      timeoutTitle: "تايم أوت عضو",
      jailTitle: "سجن عضو",
      userWarnTitle: "تحذير عضو",
      staffWarnTitle: "تحذير إداري",
      user: { label: "العضو", placeholder: "اختر العضو" },
      reason: { label: "السبب", placeholder: "سبب الإجراء" },
      evidence: { label: "الدليل", description: (max: number) => `ارفع صورة أو أكثر (حد أقصى ${max}).` },
      duration: { label: "المدة", placeholder: "مثال: 5m · 30m · 1h · 6h · 1d · 7d" },
      verbal: { label: "تحذير شفوي", description: "علّمها لتحذير شفوي؛ 3 شفوية تصير تحذير رسمي." },
    },

    errors: {
      notStaff: `${E.error} للطاقم بس.`,
      unknownAction: `${E.error} إجراء غير معروف.`,
      userRequired: `${E.error} اختر عضو.`,
      reasonRequired: `${E.error} اكتب السبب.`,
      evidenceRequired: `${E.error} ارفع دليل واحد على الأقل.`,
      targetIsSelf: `${E.error} ما تقدر تطبّقه على نفسك.`,
      targetIsBot: `${E.error} ما تقدر تطبّقه على بوت.`,
      targetLeft: `${E.error} العضو ما عاد في السيرفر.`,
      durationRequired: `${E.error} حدد المدة.`,
      durationInvalid: `${E.error} مدة غير صحيحة. استخدم \`30m\` أو \`6h\` أو \`3d\`.`,
      durationTooShort: (min: string) => `${E.error} أقل مدة تايم أوت ${min}.`,
      durationTooLong: (max: string) => `${E.error} ديسكورد يسمح بتايم أوت حتى ${max}.`,
      timeoutFailed: (reason: string) => `${E.error} ما تم التايم أوت: ${reason}`,
      jailFailed: (reason: string) => `${E.error} ما تم السجن: ${reason}`,
      jailDenied: {
        TARGET_IS_STAFF: `${E.error} ما ينسجن الإداري، عقوباته بالتحذيرات.`,
        TARGET_OUTRANKS_ACTOR: `${E.error} ما تقدر تسجن رتبة مثلك أو أعلى.`,
      } as Record<string, string>,
      inFlight: `${E.warning} فيه إجراء شغّال على نفس العضو. جرّب بعد ثواني.`,
      crashed: `${E.error} صار خطأ وما تم شيء.`,
    },

    success: {
      timeout: (mention: string, duration: string) => `${E.success} تايم أوت لـ ${mention} لمدة **${duration}**.`,
      jail: (mention: string) => `${E.success} تم سجن ${mention}.`,
      userWarn: (mention: string) => `${E.success} تم تحذير ${mention}.`,
      staffWarnVerbal: (mention: string) => `${E.success} تحذير شفوي على ${mention}.`,
      staffWarnReal: (mention: string, level: number) => `${E.success} **تحذير رسمي ${level}** على ${mention}.`,
      convertedToReal: (count: number) => `${E.warning} تحوّلت ${count} تحذيرات شفوية إلى تحذير رسمي.`,
      demoted: (mention: string, from: number, to: number) => `${E.warning} ${mention} وصل **3 تحذيرات**: تنزيل **${from} → ${to}** وتصفير التحذيرات.`,
      fired: (mention: string) => `${E.error} ${mention} وصل **3 تحذيرات** وهو على المستوى 0، فتم فصله.`,
    },
  },
);
