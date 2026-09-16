import type { TicketMainConfig } from "./types.ts";
import { colors } from "../config/colors.ts";
import { branding } from "../config/branding.ts";

export const ticketMain: TicketMainConfig = {
  panelChannelId: "1536249118681210953",

  managerRoleId: "1536248952301813780",

  // Set this to a real channel id to receive closed/deleted ticket
  // transcripts. Left as the all-zero placeholder (matches UNSET_ID in
  // ./index.ts — kept as a literal here to avoid a circular import),
  // transcripts are only stored, never posted.
  transcriptChannelId: "000000000000000000",

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
