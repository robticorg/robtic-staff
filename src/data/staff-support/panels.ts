import { L, currentLang } from "../../shared/utils/lang-context.ts";
import { colors } from "../config/colors.ts";
import { UNSET_ID, type TicketPanelConfig } from "../tickets/types.ts";

export const StaffSupportWorkflow = {
  STAFF_SUPPORT: "staff-support",
  BREAK_APPLY: "break-apply",
} as const;
export type StaffSupportWorkflow =
  (typeof StaffSupportWorkflow)[keyof typeof StaffSupportWorkflow];

export const staffSupportPanel: TicketPanelConfig = {
  id: StaffSupportWorkflow.STAFF_SUPPORT,
  ticketPrefix: "staff",
  get name() { return L("Staff support", "دعم الادارة"); },
  get description() { return L("Contact the admins", "تواصل مع الإدارة"); },
  hidden: true,

  supportRoleId: UNSET_ID,
  supportRoleOptional: true,

  questions: { enabled: false, items: [] },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: true,
    onlyOnce: true,
    transferable: false,
  },

  close: { transcript: true, delete: true },

  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.primary,
    get text() { return currentLang() === "en" ? ["Staff support request. The admins will reply here."] : ["طلب دعم إداري، والإدارة بترد عليك هنا."]; },
  },
};
