import type { TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../gift-claim/config.ts";

export const giftClaimPanel: TicketPanelConfig = {
  id: GIFT_CLAIM_PANEL_ID,
  name: "استلام هدية",
  description: "استلم هدية أو مكافأة فزت فيها.",
  emoji: "🎁",

  supportRoleId: "1545812169525035132",
  categoryId: "1545812173807157389",
  logChannelId: "1545812173362700294",

  questions: { enabled: false, items: [] },

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

  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.primary,
    text: [
      "## 🎁 استلام هدية",
      "ارفع **صورة** تثبت إنك فزت بالهدية اللي كتبتها، ومانجر الهدايا راح يراجعها ويسلّمك جائزتك.",
    ],
    footer: "لا تشارك كلمات سر الحساب أو التوكنات.",
  },
};
