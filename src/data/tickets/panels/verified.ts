import type { TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const technicalPanel: TicketPanelConfig = {
  id: "verified-girls",
  name: "تـوثـيـق بـنـات",
  description: "اذا انتي بنت و تريدين رتبة توثيق فقط فكي هذا تكت",
  emoji: "<:FL_7b:1486139849131032587>",

  supportRoleId: "1536248969611452476",
  categoryId: "1536249080924348447",
  logChannelId: "1545812173362700294",
  
  questions: {
    enabled: false,
    items: [],
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
