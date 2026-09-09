import type { TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const accountPanel: TicketPanelConfig = {
  id: "account",
  name: "الـدعـم الـفـنـي",
  description: "استرجاع حسابك أو إدارته.",
  emoji: "👤",

  supportRoleId: "1545812169525035132",
  categoryId: "1545812173807157389",
  logChannelId: "1545812173362700294",

  questions: {
    enabled: true,
    items: [
      {
        id: "account",
        label: "اسم الحساب / الإيميل المسجّل",
        placeholder: "لا تكتب كلمة السر أبداً",
        style: "SHORT",
        required: true,
        minLength: 3,
        maxLength: 200,
      },
      {
        id: "request",
        label: "وش تحتاج مساعدة فيه؟",
        placeholder: "مثال: ما أقدر أسجّل دخول، أبي أغيّر الإيميل…",
        style: "PARAGRAPH",
        required: true,
        minLength: 10,
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
    delete: true,
  },

  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.warning,
    text: [
      "## دعم الحساب",
      "لأمانك، لا تنشر أبداً كلمات السر أو أكواد التحقق (2FA) أو أرقام بطاقات الدفع في هذا التكت.",
    ],
  },
};
