import { colors } from "../../config/colors.ts";
import { UNSET_ID, type TicketPanelConfig } from "../types.ts";

export const RESPONSIBILITY_APPLY_PANEL_ID = "responsibility-apply";

export const responsibilityApplyPanel: TicketPanelConfig = {
  id: RESPONSIBILITY_APPLY_PANEL_ID,
  name: "التقديم على مسؤولية",
  description: "قدّم على مسؤولية في السيرفر.",
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
    text: ["تم فتح طلب تقديم على مسؤولية.\nبانتظار أحد المسؤولين لاستلام الطلب."],
  },
};
