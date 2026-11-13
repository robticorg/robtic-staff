import { L, currentLang } from "../../../shared/utils/lang-context.ts";
import { UNSET_ID, type TicketPanelConfig } from "../types.ts";
import { colors } from "../../config/colors.ts";

export const verifiedPanel: TicketPanelConfig = {
  id: "verified-girls",
  ticketPrefix: "verify",
  get name() { return L("Girls' verification", "تـوثـيـق بـنـات"); },
  get description() { return L("For girls who want the verification role.", "اذا انتي بنت و تريدين رتبة توثيق فقط فكي هذا تكت"); },
  emoji: "<:FL_7b:1486139849131032587>",

  supportRoleId: UNSET_ID,

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
    get text() { return currentLang() === "en" ? ["Welcome to verification. Please wait for the verifier to review your request; you'll get a reply soon."] : ["أهلاً بك في التوثيق. انتظر لين تراجع الموثقة طلبك، وبيوصلك رد قريب."]; },
  },
};
