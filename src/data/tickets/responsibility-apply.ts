import { emojis } from "../emojis/index.ts";

const E = emojis;

export const responsibilityApplyMessages = {
  panel: {
    title: "## التقديم على مسؤولية",
    description: "تبي تقدّم على مسؤولية في السيرفر؟ اضغط الزر تحت وعبّي النموذج.",
    button: "قدّم على مسؤولية",
  },

  modal: {
    title: "تقديم مسؤولية في خادم روبتك",
    responsibilityLabel: "اسم المسؤولية",
    responsibilityPlaceholder: "اختر المسؤولية",
    explainLabel: "شرح المسؤولية",
    explainPlaceholder: "اشرح المسؤولية بأسلوبك",
    jobLabel: "وش وظيفة المسؤولية؟",
    jobPlaceholder: "وش المهام اللي بتسويها؟",
    situationLabel: "لو طحت ب موقف كيف راح تحله؟",
    situationDescription: "اشرح مع تفصيل ممل",
    situationPlaceholder: "اذكر موقف وكيف بتتصرف فيه خطوة بخطوة",
    commitLabel: "بتكون قد المسؤولية؟",
    commitDescription: "أتعهد إني أكون قد المسؤولية وأقوم بمهامي كاملة وألتزم بقوانين السيرفر.",
  },

  answers: {
    responsibility: "اسم المسؤولية",
    explain: "شرح المسؤولية",
    job: "وش وظيفة المسؤولية؟",
    situation: "لو طحت ب موقف كيف راح تحله مع تفصيل ممل",
    commit: "بتكون قد المسؤولية؟",
    committed: "✅ نعم، أتعهد أكون قد المسؤولية",
  },

  decision: {
    accepted: (userId: string, title: string) =>
      `${E.success} تم قبول <@${userId}> وإعطاؤه مسؤولية **${title}**.`,
    refused: (userId: string, title: string, reason: string) =>
      `${E.error} تم رفض طلب <@${userId}> على مسؤولية **${title}**.\n**السبب:** ${reason}`,
    dmAccepted: (title: string) => `🎉 تم قبولك في مسؤولية **${title}**. بالتوفيق!`,
    dmRefused: (title: string, reason: string) => `تم رفض طلبك على مسؤولية **${title}**.\n**السبب:** ${reason}`,
    notManager: `${E.error} القبول والرفض لمسؤول هذا التكت أو الأدمن بس.`,
    selfDecision: `${E.error} ما تقدر تقبل أو ترفض طلبك انت.`,
    alreadyDecided: `${E.warning} تم البت في هذا الطلب من قبل.`,
    reasonRequired: `${E.warning} الطريقة: \`!refuse <السبب>\``,
    noResponsibility: `${E.error} ما لقيت المسؤولية اللي انطلبت في هذا التكت.`,
  },

  errors: {
    none: `${E.error} ما فيه مسؤوليات مضافة حالياً.`,
    notConfigured: `${E.error} تكت التقديم على المسؤولية مو مضبوط. الإدارة لازم تضبطه من \`/ticket setup\`.`,
    mustCommit: `${E.error} لازم تأشّر على "بتكون قد المسؤولية؟" عشان يوصل طلبك.`,
    responsibilityGone: `${E.error} المسؤولية اللي اخترتها ما عادت موجودة.`,
    fieldsRequired: `${E.error} لازم تجاوب على كل الأسئلة.`,
  },
} as const;
