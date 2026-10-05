import { UNSET_ID, type TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const supportPanel: TicketPanelConfig = {
  id: "support",
  ticketPrefix: "ticket",
  name: "الـدعـم الـفـنـي",
  description: "تواصل مع فريق الدعم الفني لحل مشاكل الخاصة بك.",
  emoji: "<a:736257973906571306:1485939519642537994>",

  supportRoleId: UNSET_ID,

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
    transferable: true,
  },

  close: {
    transcript: true,
    delete: true,
  },

  faq: { enabled: true },

  ticketMessage: {
    accentColor: colors.warning,
    text: [
      "أهلًا بك في الدعم الفني، فريقنا جاهز لمساعدتك في حل مشكلتك.",
      "لأمانك، لا تشارك كلمات المرور أو أكواد التحقق (2FA) أو بيانات الدفع داخل التذكرة.",
      "",
      "Welcome to Technical Support. Our team is ready to help you resolve your issue.",
      "For your security, never share passwords, 2FA codes, or payment information in your ticket.",
    ],
  },
};
