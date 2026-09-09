import type { TicketMainConfig } from "./types.ts";
import { colors } from "../config/colors.ts";
import { branding } from "../config/branding.ts";

export const ticketMain: TicketMainConfig = {
  panelChannelId: "1545812173807157398",

  managerRoleId: "1545812169495552019",

  selectPlaceholder: "اختر قسم…",

  content: {
    accentColor: colors.primary,
    text: [
      `# دعم ${branding.communityName}`,
      "تحتاج مساعدة؟ اختر القسم اللي يناسب مشكلتك من تحت وراح ينفتح لك تكت.",
    ],
    footer: branding.footers.support,
  },
};
