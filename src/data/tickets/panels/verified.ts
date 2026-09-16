import type { TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const verifiedPanel: TicketPanelConfig = {
  id: "verified-girls",
  name: "تـوثـيـق بـنـات",
  description: "اذا انتي بنت و تريدين رتبة توثيق فقط فكي هذا تكت",
  emoji: "<:FL_7b:1486139849131032587>",

  supportRoleId: "1536248969611452476",
  categoryId: "1536249080924348447",
  logChannelId: "1536249123265581056",
  
  questions: {
    enabled: false,
    items: [],
  },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: true,
    onlyOnce: true,
    transferable: true,
  },

  close: {
    transcript: true,
    delete: false,
  },

  faq: { enabled: true },

  ticketMessage: {
    accentColor: colors.info,
    text: [
      "انت يا حلوة استني الموثقة تجيك و تراجع تكتك و تعطيك رتبة التوثيق",
      "الرجاء التحلي بالصبر و عدم ازعاج الموثقة او المسؤولين و سيتم رد عليكي في اسرع وقت",
    ],
    footer: "لا تشارك كلمات السر أو التوكنات.",
  },
};
