import { emojis } from "../emojis/index.ts";
import { branding } from "../config/branding.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;
const S = branding.communityName;
const n = (v: number) => v.toLocaleString("en-US");

export { formatElapsedDays as formatMembershipDuration } from "../messages/duration.ts";

type Labels = Record<string, string>;

export const APPLICATION_TYPE_LABELS: Labels = bilingual<Labels>(
  { NORMAL_APPLICATION: `New staff application`, TRANSFER_APPLICATION: `Transfer your rank from another server` },
  { NORMAL_APPLICATION: "تقديم إداري جديد", TRANSFER_APPLICATION: "نقل رتبتك من سيرفر آخر" },
);

export const DEPARTMENT_LABELS: Labels = bilingual<Labels>(
  { DEVELOPER: "Developer", DESIGNER: "Designer", EDITOR: "Editor", STAFF: "Staff" },
  { DEVELOPER: "مبرمج", DESIGNER: "مصمم", EDITOR: "ممنتج", STAFF: "إداري" },
);

export const GENDER_LABELS: Labels = bilingual<Labels>({ MALE: "Male", FEMALE: "Female" }, { MALE: "ولد", FEMALE: "بنت" });

export const GIRL_VERIFICATION_LABELS: Labels = bilingual<Labels>(
  { PENDING: "Pending verification", VERIFIED: "Verified" },
  { PENDING: "بانتظار التوثيق", VERIFIED: "موثّقة" },
);

export const APPLICATION_STATUS_LABELS: Labels = bilingual<Labels>(
  { PENDING: "Waiting", CLAIMED: "Claimed", UNDER_REVIEW: "Under review", ACCEPTED: "Accepted", REJECTED: "Rejected", CLOSED: "Closed" },
  { PENDING: "بانتظار الاستلام", CLAIMED: "مستلَم", UNDER_REVIEW: "قيد المراجعة", ACCEPTED: "مقبول", REJECTED: "مرفوض", CLOSED: "مغلق" },
);

export const staffApplicationMessages = bilingual(
  {
    firstModal: {
      title: "Apply or transfer to staff",
      identityLabel: "Name, age and city",
      identityPlaceholder: "Ahmed\n19\nRiyadh",
      typeLabel: "Request type",
      typePlaceholder: "Choose a type",
      recruiterLabel: "Who referred you?",
      recruiterDescription: "Optional",
      termsLabel: "I agree to the staff rules and terms.",
    },

    validation: {
      termsRequired: `${E.error} Agree to the staff rules to apply.`,
      identityInvalid: `${E.error} Write your name, age and city, one per line. Example:\nAhmed\n19\nRiyadh`,
      ageInvalid: `${E.error} Age must be a whole number.`,
      typeRequired: `${E.error} Choose a request type.`,
      staffBlacklisted: `${E.error} You're on the staff blacklist and can't apply.`,
      alreadyStaff: `${E.error} You're already staff.`,
      alreadyOpen: (channelId: string) => `${E.warning} You already have an open request: <#${channelId}>.`,
      sessionExpired: `${E.warning} Session expired. Start again from the ticket panel.`,
      notYourSession: `${E.error} This step is for the applicant only.`,
    },

    recruiter: {
      notFound: `${E.error} The referrer you chose isn't in the server.`,
      self: `${E.error} You can't refer yourself.`,
      bot: `${E.error} A bot can't be a referrer.`,
      notEligible: `${E.error} The referrer must be an owner or higher. Pick someone else or leave it empty.`,
      usage: `${E.warning} Usage: \`!from @owner\``,
      notInApplication: `${E.error} \`!from\` works inside an application or transfer ticket only.`,
      alreadySet: (recruiterId: string) => `${E.warning} Already referred by <@${recruiterId}>. An admin can change it: \`!from @owner replace\`.`,
      replaceAdminOnly: `${E.error} Only admins can change the referrer.`,
      saved: (applicantId: string, recruiterId: string) => `${E.success} <@${applicantId}> referred by <@${recruiterId}>.`,
      replaced: (applicantId: string, recruiterId: string) => `${E.success} <@${applicantId}>'s referrer is now <@${recruiterId}>.`,
    },

    apply: {
      intro: [
        "## Staff Application",
        `Thanks for your interest in joining the ${S} staff team.`,
        "Press the button below to start.",
      ],
      startButton: "Start application",
      genderPrompt: "## Your gender?",
      genderPlaceholder: "Choose",
      girlNotice: "Girls are verified by the girls' staff before the application continues.",
      departmentPrompt: "## Which area are you applying for?",
      departmentPlaceholder: "Choose an area",
      creating: `${E.loading} Opening your request…`,
    },

    transfer: {
      intro: [
        "## Staff Transfer",
        `Transfer your staff rank to ${S}. The server must have at least 4,000 members. Share its invite link (the bot checks the counts), then upload your proof.`,
      ],
      startButton: "Start transfer",
      modalTitle: "Transfer details",
      inviteLabel: "Server invite link",
      invitePlaceholder: "https://discord.gg/…",
      inviteRequired: `${E.error} Send the server's invite link.`,
      serverUsage: `${E.warning} Usage: \`!server <invite-code>\`, e.g. \`!server ExRgT\``,
      serverCard: (link: string, name: string, members: number, online: number) =>
        [`## ${name}`, `**Link:** ${link}`, `**Members:** ${n(members)}`, `**Online:** ${n(online)}`].join("\n"),
      inviteInvalid: `${E.error} That invite is invalid or expired. Send a permanent one.`,
      inviteIsHome: `${E.error} That's ${S}'s own invite. Send the server where you were staff.`,
      evidencePrompt: (min: number, max: number) => [
        "## Proof",
        `Upload ${min} to ${max} images showing:`,
        "- The server\n- Member count\n- Online count\n- Your role\n- The role's position",
      ],
      belowMinimumNotice: (min: number) => `${E.warning} The server has fewer than ${n(min)} members, so the request won't be eligible.`,
      evidenceButton: "Upload proof",
      evidenceModalTitle: "Transfer proof",
      evidenceLabel: "Proof images",
      evidenceTooFew: (min: number) => `${E.error} Upload at least ${min} images.`,
      evidenceNotImage: `${E.error} Proof must be images only.`,
      evidenceTooLarge: `${E.error} An image is too large. Shrink it and try again.`,
      evidenceDownloadFailed: `${E.error} Couldn't save the images. Try uploading again.`,
      creating: `${E.loading} Opening your transfer request…`,
    },

    create: {
      managerRoleMissing: `${E.error} The manager role for this request isn't set. Contact the admins.`,
      created: (channelId: string) => `${E.success} Your request is open: <#${channelId}>.`,
      failed: `${E.error} Couldn't open the request. Try again.`,
    },

    ticket: {
      applicationHeader: (ticketName: string) => `## Application · \`${ticketName}\``,
      transferHeader: (ticketName: string) => `## Transfer · \`${ticketName}\``,
      applicationOpened: "New application. Waiting for a manager to claim it.",
      transferOpened: "New transfer request. Waiting for a transfer manager to claim it.",
      applicant: (userId: string) => `**Applicant:** <@${userId}>`,
      type: (label: string) => `**Type:** ${label}`,
      department: (label: string) => `**Area:** ${label}`,
      gender: (label: string) => `**Gender:** ${label}`,
      managers: (roleIds: readonly string[]) => `**Managers:** ${roleIds.map((id) => `<@&${id}>`).join(" ")}`,
      proposed: (value: string) => `**Expected rank:** ${value}`,
      proposedNote: "-# The expected rank isn't final; the manager decides.",
      status: (label: string) => `-# Status: ${label}`,
      ineligibleHeading: `${E.warning} **Not eligible under the current transfer rules:**`,
      ineligible: {
        MEMBER_COUNT: (min: number) => `- The server has fewer than ${n(min)} members.`,
      },
      tierNotConfigured: "- The expected tier's start role isn't set in `/role boundary`.",
      evidenceHeading: (count: number) => `**Proof (${count}):**`,
      closeButton: "Close",
      optionsButton: "Options",
      infoButton: "Info",
    },

    info: {
      title: "## Request info",
      name: (value: string) => `**Name:** ${value}`,
      age: (value: number) => `**Age:** ${value}`,
      city: (value: string) => `**City:** ${value}`,
      gender: (value: string) => `**Gender:** ${value}`,
      type: (value: string) => `**Type:** ${value}`,
      department: (value: string) => `**Area:** ${value}`,
      girlVerification: (value: string) => `**Verification:** ${value}`,
      recruiter: (userId: string | null) => `**Referred by:** ${userId ? `<@${userId}>` : "Nobody"}`,
      sourceServer: (value: string) => `**Server:** ${value}`,
      memberCount: (value: number, verified: boolean) => `**Members:** ${n(value)}${verified ? " · ✔️ checked" : ""}`,
      onlineCount: (value: number, verified: boolean) => `**Online:** ${n(value)}${verified ? " · ✔️ checked" : ""}`,
      roleOrder: (value: number) => `**Role position:** ${value}`,
      membership: (value: string) => `**Time in ${S}:** ${value}`,
      proposed: (value: string) => `**Expected rank:** ${value}`,
      evidenceCount: (value: number) => `**Proof:** ${value}`,
      status: (value: string) => `**Status:** ${value}`,
      notAllowed: `${E.error} Only the applicant and its managers can see this.`,
      proposedLevel: (roleId: string | null, level: number) => (roleId ? `<@&${roleId}> (level ${level})` : `Level ${level}`),
      noProposal: "None",
    },

    decision: {
      notInApplication: `${E.error} Use this inside an application or transfer ticket.`,
      notManager: `${E.error} For this request's managers only.`,
      claimFirst: `${E.warning} Claim the request before deciding.`,
      wrongTarget: (applicantId: string) => `${E.error} This ticket is for <@${applicantId}> only.`,
      applicantGone: `${E.error} The applicant left the server.`,
      alreadyStaff: (userId: string) => `${E.warning} <@${userId}> is already staff.`,
      alreadyDecided: `${E.warning} This request was already decided.`,
      ineligible: `${E.error} Not eligible under the current transfer rules; it can't be accepted.`,
      noProposal: `${E.error} No expected rank. Give the level yourself: \`!accept 40\`.`,
      selfDecision: `${E.error} You can't decide your own request.`,
      refuseUsage: `${E.warning} Usage: \`!refuse <reason>\``,
      refused: (userId: string) => `${E.success} <@${userId}>'s request refused.`,
      refusedNotice: (reason: string) => `${E.error} **Request refused.** Reason: ${reason}`,
      acceptedNotice: (userId: string, level: number) => `${E.success} **<@${userId}> accepted to staff at level ${level}.**`,
    },

    verify: {
      usage: `${E.warning} Usage: \`!verify @user\``,
      notAllowed: `${E.error} Only girls' staff and admins can verify.`,
      verifiedRoleMissing: `${E.error} The verified-girl role isn't set. Run \`/role set\` first.`,
      alreadyVerified: (userId: string) => `${E.warning} <@${userId}> is already verified.`,
      done: (userId: string) => `${E.success} <@${userId}> verified.`,
      ticketNotice: (managerId: string) => `${E.success} Verified by <@${managerId}>.`,
      failed: `${E.error} Couldn't update her roles. Make sure my role is above the verification roles.`,
    },
  },
  {
    firstModal: {
      title: "التقديم أو النقل للطاقم",
      identityLabel: "الاسم والعمر والمدينة",
      identityPlaceholder: "أحمد\n19\nالرياض",
      typeLabel: "نوع الطلب",
      typePlaceholder: "اختر النوع",
      recruiterLabel: "مين عرّفك على الفريق؟",
      recruiterDescription: "اختياري",
      termsLabel: "أوافق على قوانين وشروط الإدارة.",
    },

    validation: {
      termsRequired: `${E.error} وافق على قوانين الإدارة عشان تقدّم.`,
      identityInvalid: `${E.error} اكتب اسمك وعمرك ومدينتك، كل وحدة في سطر. مثال:\nأحمد\n19\nالرياض`,
      ageInvalid: `${E.error} العمر لازم يكون رقم صحيح.`,
      typeRequired: `${E.error} اختر نوع الطلب.`,
      staffBlacklisted: `${E.error} أنت في بلاك ليست الإدارة وما تقدر تقدّم.`,
      alreadyStaff: `${E.error} أنت إداري أصلاً.`,
      alreadyOpen: (channelId: string) => `${E.warning} عندك طلب مفتوح: <#${channelId}>.`,
      sessionExpired: `${E.warning} انتهت الجلسة. ابدأ من جديد من لوحة التكتات.`,
      notYourSession: `${E.error} هذي الخطوة لصاحب الطلب بس.`,
    },

    recruiter: {
      notFound: `${E.error} اللي اخترته مو موجود في السيرفر.`,
      self: `${E.error} ما تقدر تختار نفسك.`,
      bot: `${E.error} ما تقدر تختار بوت.`,
      notEligible: `${E.error} لازم يكون أونر أو أعلى. اختر شخص ثاني أو خلّها فاضية.`,
      usage: `${E.warning} الطريقة: \`!from @owner\``,
      notInApplication: `${E.error} \`!from\` داخل تكت تقديم أو نقل بس.`,
      alreadySet: (recruiterId: string) => `${E.warning} مسجّل من طرف <@${recruiterId}>. التغيير للأدمن: \`!from @owner replace\`.`,
      replaceAdminOnly: `${E.error} التغيير للأدمن بس.`,
      saved: (applicantId: string, recruiterId: string) => `${E.success} تم تسجيل <@${applicantId}> من طرف <@${recruiterId}>.`,
      replaced: (applicantId: string, recruiterId: string) => `${E.success} صار معرّف <@${applicantId}> هو <@${recruiterId}>.`,
    },

    apply: {
      intro: [
        "## التقديم للإدارة",
        `شكراً لاهتمامك بالانضمام لطاقم ${S}.`,
        "اضغط الزر تحت للبدء.",
      ],
      startButton: "ابدأ التقديم",
      genderPrompt: "## الجنس؟",
      genderPlaceholder: "اختر",
      girlNotice: "البنات يتم توثيقهن من إدارة البنات قبل إكمال التقديم.",
      departmentPrompt: "## تقدّم على أي مجال؟",
      departmentPlaceholder: "اختر المجال",
      creating: `${E.loading} جاري فتح الطلب…`,
    },

    transfer: {
      intro: [
        "## النقل للإدارة",
        `انقل رتبتك الإدارية إلى ${S}. لازم السيرفر فيه 4,000 عضو على الأقل. أرسل رابط دعوته (البوت يتحقق من الأعداد)، وبعدها ارفع إثباتاتك.`,
      ],
      startButton: "ابدأ طلب النقل",
      modalTitle: "معلومات النقل",
      inviteLabel: "رابط دعوة السيرفر",
      invitePlaceholder: "https://discord.gg/…",
      inviteRequired: `${E.error} أرسل رابط دعوة السيرفر.`,
      serverUsage: `${E.warning} الطريقة: \`!server <كود-الدعوة>\` مثل \`!server ExRgT\``,
      serverCard: (link: string, name: string, members: number, online: number) =>
        [`## ${name}`, `**الرابط:** ${link}`, `**الأعضاء:** ${n(members)}`, `**المتصلين:** ${n(online)}`].join("\n"),
      inviteInvalid: `${E.error} الرابط غير صالح أو منتهي. أرسل رابط دائم.`,
      inviteIsHome: `${E.error} هذا رابط ${S} نفسه. أرسل السيرفر اللي كنت إداري فيه.`,
      evidencePrompt: (min: number, max: number) => [
        "## الإثباتات",
        `ارفع من ${min} إلى ${max} صور توضّح:`,
        "- السيرفر\n- عدد الأعضاء\n- عدد المتصلين\n- رتبتك\n- ترتيب الرتبة",
      ],
      belowMinimumNotice: (min: number) => `${E.warning} أعضاء السيرفر أقل من ${n(min)}، فالطلب بيكون غير مؤهل.`,
      evidenceButton: "رفع الإثباتات",
      evidenceModalTitle: "إثباتات النقل",
      evidenceLabel: "صور الإثبات",
      evidenceTooFew: (min: number) => `${E.error} ارفع ${min} صور على الأقل.`,
      evidenceNotImage: `${E.error} الإثباتات صور بس.`,
      evidenceTooLarge: `${E.error} فيه صورة كبيرة. صغّرها وجرّب مرة ثانية.`,
      evidenceDownloadFailed: `${E.error} ما قدرت أحفظ الصور. ارفعها مرة ثانية.`,
      creating: `${E.loading} جاري فتح طلب النقل…`,
    },

    create: {
      managerRoleMissing: `${E.error} رتبة المسؤول عن الطلب غير مضبوطة. كلّم الإدارة.`,
      created: (channelId: string) => `${E.success} تم فتح طلبك: <#${channelId}>.`,
      failed: `${E.error} ما قدرت أفتح الطلب. جرّب مرة ثانية.`,
    },

    ticket: {
      applicationHeader: (ticketName: string) => `## طلب تقديم · \`${ticketName}\``,
      transferHeader: (ticketName: string) => `## طلب نقل · \`${ticketName}\``,
      applicationOpened: "طلب تقديم جديد، بانتظار استلام أحد المسؤولين.",
      transferOpened: "طلب نقل جديد، بانتظار استلام أحد مسؤولي النقل.",
      applicant: (userId: string) => `**المتقدم:** <@${userId}>`,
      type: (label: string) => `**النوع:** ${label}`,
      department: (label: string) => `**المجال:** ${label}`,
      gender: (label: string) => `**الجنس:** ${label}`,
      managers: (roleIds: readonly string[]) => `**المسؤولين:** ${roleIds.map((id) => `<@&${id}>`).join(" ")}`,
      proposed: (value: string) => `**الرتبة المتوقعة:** ${value}`,
      proposedNote: "-# الرتبة المتوقعة مو نهائية، القرار للمسؤول.",
      status: (label: string) => `-# الحالة: ${label}`,
      ineligibleHeading: `${E.warning} **غير مؤهل حسب شروط النقل الحالية:**`,
      ineligible: {
        MEMBER_COUNT: (min: number) => `- أعضاء السيرفر أقل من ${n(min)}.`,
      },
      tierNotConfigured: "- رتبة بداية التصنيف المتوقع غير مضبوطة في `/role boundary`.",
      evidenceHeading: (count: number) => `**الإثباتات (${count}):**`,
      closeButton: "إغلاق",
      optionsButton: "خيارات",
      infoButton: "المعلومات",
    },

    info: {
      title: "## معلومات الطلب",
      name: (value: string) => `**الاسم:** ${value}`,
      age: (value: number) => `**العمر:** ${value}`,
      city: (value: string) => `**المدينة:** ${value}`,
      gender: (value: string) => `**الجنس:** ${value}`,
      type: (value: string) => `**النوع:** ${value}`,
      department: (value: string) => `**المجال:** ${value}`,
      girlVerification: (value: string) => `**التوثيق:** ${value}`,
      recruiter: (userId: string | null) => `**معرّفه:** ${userId ? `<@${userId}>` : "ما فيه"}`,
      sourceServer: (value: string) => `**السيرفر:** ${value}`,
      memberCount: (value: number, verified: boolean) => `**الأعضاء:** ${n(value)}${verified ? " · ✔️ متحقق" : ""}`,
      onlineCount: (value: number, verified: boolean) => `**المتصلين:** ${n(value)}${verified ? " · ✔️ متحقق" : ""}`,
      roleOrder: (value: number) => `**ترتيب الرتبة:** ${value}`,
      membership: (value: string) => `**مدته في ${S}:** ${value}`,
      proposed: (value: string) => `**الرتبة المتوقعة:** ${value}`,
      evidenceCount: (value: number) => `**الإثباتات:** ${value}`,
      status: (value: string) => `**الحالة:** ${value}`,
      notAllowed: `${E.error} لصاحب الطلب ومسؤوليه بس.`,
      proposedLevel: (roleId: string | null, level: number) => (roleId ? `<@&${roleId}> (المستوى ${level})` : `المستوى ${level}`),
      noProposal: "ما فيه",
    },

    decision: {
      notInApplication: `${E.error} داخل تكت تقديم أو نقل بس.`,
      notManager: `${E.error} لمسؤولي هذا الطلب بس.`,
      claimFirst: `${E.warning} استلم الطلب قبل القرار.`,
      wrongTarget: (applicantId: string) => `${E.error} التكت لـ <@${applicantId}> بس.`,
      applicantGone: `${E.error} المتقدم طلع من السيرفر.`,
      alreadyStaff: (userId: string) => `${E.warning} <@${userId}> من الطاقم أصلاً.`,
      alreadyDecided: `${E.warning} الطلب تم البت فيه.`,
      ineligible: `${E.error} غير مؤهل حسب شروط النقل، ما ينقبل.`,
      noProposal: `${E.error} ما فيه رتبة متوقعة. حدد المستوى: \`!accept 40\`.`,
      selfDecision: `${E.error} ما تقدر تقرر في طلبك.`,
      refuseUsage: `${E.warning} الطريقة: \`!refuse <السبب>\``,
      refused: (userId: string) => `${E.success} تم رفض طلب <@${userId}>.`,
      refusedNotice: (reason: string) => `${E.error} **تم رفض الطلب.** السبب: ${reason}`,
      acceptedNotice: (userId: string, level: number) => `${E.success} **تم قبول <@${userId}> في الطاقم على المستوى ${level}.**`,
    },

    verify: {
      usage: `${E.warning} الطريقة: \`!verify @user\``,
      notAllowed: `${E.error} التوثيق لإدارة البنات والأدمن بس.`,
      verifiedRoleMissing: `${E.error} رتبة «بنت موثّقة» غير مضبوطة. شغّل \`/role set\`.`,
      alreadyVerified: (userId: string) => `${E.warning} <@${userId}> موثّقة أصلاً.`,
      done: (userId: string) => `${E.success} تم توثيق <@${userId}>.`,
      ticketNotice: (managerId: string) => `${E.success} وثّقها <@${managerId}>.`,
      failed: `${E.error} ما قدرت أعدّل رتبها. تأكد إن رتبتي فوق رتب التوثيق.`,
    },
  },
);
