import type { TicketMainConfig } from "./types.ts";
import { colors } from "../config/colors.ts";
import { branding } from "../config/branding.ts";

export const ticketMain: TicketMainConfig = {
  panelChannelId: "1536249118681210953",

  managerRoleId: "1536248952301813780",

  selectPlaceholder: "اختر القسم اللي يناسب مشكلتك",

  content: {
    accentColor: colors.primary,
    text: [
      `## دعم ${branding.communityName}`,
      "تحتاج مساعدة؟ اختر القسم اللي يناسب مشكلتك من تحت وراح ينفتح لك تكت.",
    ],
    footer: branding.footers.support,
  },
};
