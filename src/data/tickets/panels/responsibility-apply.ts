import { L, currentLang } from "../../../shared/utils/lang-context.ts";
import { colors } from "../../config/colors.ts";
import { UNSET_ID, type TicketPanelConfig } from "../types.ts";

export const RESPONSIBILITY_APPLY_PANEL_ID = "responsibility-apply";

export const responsibilityApplyPanel: TicketPanelConfig = {
  id: RESPONSIBILITY_APPLY_PANEL_ID,
  ticketPrefix: "res",
  get name() { return L("Apply for a responsibility", "التقديم على مسؤولية"); },
  get description() { return L("Apply for a responsibility in the server.", "قدّم على مسؤولية في السيرفر."); },
  hidden: true,
  independent: true,

  supportRoleId: UNSET_ID,

  questions: { enabled: false, items: [] },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: false,
    onlyOnce: true,
    transferable: true,
  },

  close: { transcript: true, delete: true },

  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.primary,
    get text() { return currentLang() === "en" ? ["New responsibility application. Waiting for a manager to claim it."] : ["طلب تقديم على مسؤولية، بانتظار استلام أحد المسؤولين."]; },
  },
};
