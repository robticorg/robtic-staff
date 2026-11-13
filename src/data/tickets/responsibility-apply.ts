import { emojis } from "../emojis/index.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

const E = emojis;

export const responsibilityApplyMessages = bilingual(
  {
    panel: {
      title: "## Apply for a responsibility",
      description: "Want a responsibility in the server? Press the button and fill in the form.",
      button: "Apply",
    },

    modal: {
      title: "Responsibility application",
      responsibilityLabel: "Responsibility",
      responsibilityPlaceholder: "Choose the responsibility",
      explainLabel: "Describe the responsibility",
      explainPlaceholder: "In your own words",
      jobLabel: "What does it involve?",
      jobPlaceholder: "The tasks you'd do",
      situationLabel: "How would you handle a tough situation?",
      situationDescription: "Explain in detail",
      situationPlaceholder: "Describe a situation and what you'd do, step by step",
      commitLabel: "Are you up to it?",
      commitDescription: "I commit to doing this responsibility fully and following the server rules.",
    },

    answers: {
      responsibility: "Responsibility",
      explain: "Description",
      job: "What it involves",
      situation: "Handling a tough situation",
      commit: "Up to it?",
      committed: "✅ Yes, I commit",
    },

    decision: {
      accepted: (userId: string, title: string) => `${E.success} <@${userId}> accepted and given **${title}**.`,
      refused: (userId: string, title: string, reason: string) => `${E.error} <@${userId}>'s application for **${title}** refused. **Reason:** ${reason}`,
      dmAccepted: (title: string) => `🎉 You're accepted for **${title}**. Good luck!`,
      dmRefused: (title: string, reason: string) => `Your application for **${title}** was refused. Reason: ${reason}`,
      notManager: `${E.error} Only this ticket's manager or an admin can decide.`,
      selfDecision: `${E.error} You can't decide your own application.`,
      alreadyDecided: `${E.warning} Already decided.`,
      reasonRequired: `${E.warning} Usage: \`!refuse <reason>\``,
      noResponsibility: `${E.error} Couldn't find the responsibility asked for in this ticket.`,
    },

    errors: {
      none: `${E.error} No responsibilities have been added.`,
      notConfigured: `${E.error} The responsibility ticket isn't set up. An admin needs to set it with \`/ticket setup\`.`,
      mustCommit: `${E.error} Tick "Are you up to it?" to send your application.`,
      responsibilityGone: `${E.error} That responsibility no longer exists.`,
      fieldsRequired: `${E.error} Answer every question.`,
    },
  },
  {
    panel: {
      title: "## التقديم على مسؤولية",
      description: "تبي مسؤولية في السيرفر؟ اضغط الزر وعبّي النموذج.",
      button: "قدّم",
    },

    modal: {
      title: "التقديم على مسؤولية",
      responsibilityLabel: "المسؤولية",
      responsibilityPlaceholder: "اختر المسؤولية",
      explainLabel: "اشرح المسؤولية",
      explainPlaceholder: "بأسلوبك",
      jobLabel: "وش مهامها؟",
      jobPlaceholder: "المهام اللي بتسويها",
      situationLabel: "كيف تتصرف في موقف صعب؟",
      situationDescription: "اشرح بالتفصيل",
      situationPlaceholder: "اذكر موقف وكيف تتصرف خطوة بخطوة",
      commitLabel: "بتكون قدها؟",
      commitDescription: "أتعهد أقوم بالمسؤولية كاملة وألتزم بقوانين السيرفر.",
    },

    answers: {
      responsibility: "المسؤولية",
      explain: "الشرح",
      job: "المهام",
      situation: "التصرف في موقف صعب",
      commit: "بتكون قدها؟",
      committed: "✅ نعم، أتعهد",
    },

    decision: {
      accepted: (userId: string, title: string) => `${E.success} تم قبول <@${userId}> وإعطاؤه **${title}**.`,
      refused: (userId: string, title: string, reason: string) => `${E.error} تم رفض طلب <@${userId}> على **${title}**. **السبب:** ${reason}`,
      dmAccepted: (title: string) => `🎉 تم قبولك في **${title}**. بالتوفيق!`,
      dmRefused: (title: string, reason: string) => `تم رفض طلبك على **${title}**. السبب: ${reason}`,
      notManager: `${E.error} القرار لمسؤول التكت أو الأدمن بس.`,
      selfDecision: `${E.error} ما تقرر في طلبك.`,
      alreadyDecided: `${E.warning} تم البت فيه.`,
      reasonRequired: `${E.warning} الطريقة: \`!refuse <السبب>\``,
      noResponsibility: `${E.error} ما لقيت المسؤولية المطلوبة في التكت.`,
    },

    errors: {
      none: `${E.error} ما فيه مسؤوليات مضافة.`,
      notConfigured: `${E.error} تكت المسؤوليات غير مضبوط. لازم الأدمن يضبطه بـ \`/ticket setup\`.`,
      mustCommit: `${E.error} أشّر على "بتكون قدها؟" عشان يوصل طلبك.`,
      responsibilityGone: `${E.error} المسؤولية ما عادت موجودة.`,
      fieldsRequired: `${E.error} جاوب على كل الأسئلة.`,
    },
  },
);
