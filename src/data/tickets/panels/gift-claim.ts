import { UNSET_ID, type TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../gift-claim/config.ts";
import { RoleConfigType } from "../../../modules/configuration/types/enums.ts";

export const giftClaimPanel: TicketPanelConfig = {
  id: GIFT_CLAIM_PANEL_ID,
  name: "اسـتـلام الـهـديـة",
  description: "استلم هدية أو مكافأة فزت فيها.",
  emoji: "<:white_money_nc:1486103487979978823>",

  supportRoleId: UNSET_ID,
  blacklistSlot: RoleConfigType.GIFT_BLACKLIST,

  createsChannel: false,

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
