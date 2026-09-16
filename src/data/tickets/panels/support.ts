import type { TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const supportPanel: TicketPanelConfig = {
  id: "support-account",
  name: "الـدعـم الـفـنـي",
  description: "تواصل مع فريق الدعم الفني لحل مشاكل الخاصة بك.",
  emoji: "<a:736257973906571306:1485939519642537994>",

  supportRoleId: "1536248963798274098",
  categoryId: "1536249080924348447",
  logChannelId: "1536249123265581056",

  questions: {
    enabled: true,
    items: [
      {
        id: "problem",
        label: "ما هي المشكلة؟",
        placeholder: "اشرح مشكلتك بالتفصيل…",
        style: "PARAGRAPH",
        required: true,
        minLength: 3,
        maxLength: 200,
      },
    ],
  },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: true,
    onlyOnce: true,
    transferable: false,
  },

  close: {
    transcript: true,
    delete: true,
  },

  faq: { enabled: true },

  ticketMessage: {
    accentColor: colors.warning,
    text: [
      "اهلا بك في الـدعـم الـفـنـي، فريق الدعم الفني جاهز لمساعدتك في حل مشاكلك.",
      "لأمانك، لا تنشر أبداً كلمات السر أو أكواد التحقق (2FA) أو أرقام بطاقات الدفع في هذا التكت.",
    ],
  },
};
