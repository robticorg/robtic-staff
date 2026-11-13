import type { TicketMainConfig } from "./types.ts";
import { colors } from "../config/colors.ts";
import { branding } from "../config/branding.ts";
import { L, currentLang } from "../../shared/utils/lang-context.ts";

export const ticketMain: TicketMainConfig = {
  get selectPlaceholder() { return L("Choose the section for your issue", "اختر القسم المناسب لمشكلتك"); },

  content: {
    accentColor: colors.primary,
    get text() {
      return currentLang() === "en"
        ? [
            `## ${branding.communityName} Support`,
            "Need help? Pick the right section below to open a ticket.",
            "-# One ticket per topic, explained clearly. No joke tickets or repeated pings, and never share private information.",
          ]
        : [
            `## دعم ${branding.communityName}`,
            "تحتاج مساعدة؟ اختر القسم المناسب تحت لفتح تكت.",
            "-# تكت واحد لكل موضوع مع شرح واضح. ممنوع تكتات المزح أو منشن الدعم المتكرر، ولا تشارك معلومات خاصة.",
          ];
    },
    get footer() { return branding.footers.support; },
  },
};
