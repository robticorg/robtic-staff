import type { TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const technicalPanel: TicketPanelConfig = {
  id: "technical",
  name: "الدعم الفني",
  description: "مساعدة في المشاكل التقنية.",
  emoji: "🛠️",

  supportRoleId: "1545812169525035132",
  categoryId: "1545812173807157389",
  logChannelId: "1545812173362700294",

  questions: {
    enabled: true,
    items: [
      {
        id: "problem",
        label: "وش المشكلة؟",
        placeholder: "اشرح مشكلتك…",
        style: "PARAGRAPH",
        required: true,
        minLength: 20,
        maxLength: 1000,
      },
      {
        id: "plugin",
        label: "أي بلقن/خاصية متأثرة؟",
        placeholder: "اكتب اسمها هنا",
        style: "SHORT",
        required: true,
        minLength: 2,
        maxLength: 100,
      },
      {
        id: "steps",
        label: "خطوات إعادة المشكلة",
        placeholder: "1) … 2) … 3) …",
        style: "PARAGRAPH",
        required: false,
        maxLength: 1000,
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
    delete: false,
  },

  faq: { enabled: true },

  ticketMessage: {
    accentColor: colors.info,
    text: [
      "## الدعم الفني",
      "إجاباتك منشورة فوق. الفني راح يراجعها ويتابع معك هنا.",
    ],
    footer: "لا تشارك كلمات السر أو التوكنات.",
  },
};
