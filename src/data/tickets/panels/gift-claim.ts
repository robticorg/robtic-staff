import { L, currentLang } from "../../../shared/utils/lang-context.ts";
import { UNSET_ID, type TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";
import { GIFT_CLAIM_PANEL_ID } from "../../gift-claim/config.ts";
import { RoleConfigType } from "../../../modules/configuration/types/enums.ts";

export const giftClaimPanel: TicketPanelConfig = {
  id: GIFT_CLAIM_PANEL_ID,
  get name() { return L("Claim a gift", "اسـتـلام الـهـديـة"); },
  get description() { return L("Claim a gift or reward you won.", "استلم هدية أو مكافأة فزت فيها."); },
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
    get text() { return currentLang() === "en" ? ["## 🎁 Claim a gift", "Upload an **image** proving you won; the gift manager will review it and deliver your reward."] : ["## 🎁 استلام هدية", "ارفع **صورة** تثبت فوزك، ومانجر الهدايا بيراجعها ويسلّمك جائزتك."]; },
    get footer() { return L("Never share account passwords or tokens.", "لا تشارك كلمات سر الحساب أو التوكنات."); },
  },
};
