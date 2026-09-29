import type { TicketMainConfig } from "./types.ts";
import { colors } from "../config/colors.ts";
import { branding } from "../config/branding.ts";

export const ticketMain: TicketMainConfig = {
  panelChannelId: "1536249118681210953",

  managerRoleId: "1536248952301813780",

  transcriptChannelId: "1549770971622154293",

  selectPlaceholder: "اختر القسم اللي يناسب مشكلتك",

  content: {
    accentColor: colors.primary,
    text: [
      `## دعم ${branding.communityName}`,
      "تحتاج مساعدة؟ اختر القسم المناسب لمشكلتك من الأسفل لفتح تذكرة.",
      "-# يرجى توضيح مشكلتك بوضوح، وفتح تذكرة واحدة فقط لكل موضوع. يُمنع استخدام التذاكر للمزاح أو منشن فريق الدعم بشكل متكرر، مع احترام فريق الدعم وعدم مشاركة أي معلومات خاصة.",
      "",
      `## ${branding.communityName} Support`,
      "Need help? Select the appropriate category below to open a ticket.",
      "-# Please describe your issue clearly and create only one ticket per topic. Do not use tickets for jokes or repeatedly mention the support team. Please respect our support team and never share private information.",
    ],
    footer: branding.footers.support,
  },
};
