import { colors } from "../config/colors.ts";
import { UNSET_ID, type TicketPanelConfig } from "../tickets/types.ts";
import { staffSupportConfig } from "./config.ts";

/**
 * Workflow ids for the Staff Support entry points. These are ticket panel ids —
 * the infrastructure is the ordinary ticket system — but they are deliberately
 * `hidden`, so they never appear in the public ticket panel and can only be
 * opened through the Staff Support panel's own buttons.
 */
export const StaffSupportWorkflow = {
  STAFF_SUPPORT: "staff-support",
  BREAK_APPLY: "break-apply",
  DEMISSION_APPLY: "demission-apply",
} as const;
export type StaffSupportWorkflow =
  (typeof StaffSupportWorkflow)[keyof typeof StaffSupportWorkflow];

/**
 * `supportRoleId` is intentionally unset on both panels: who may see a Staff
 * Support ticket depends on the *applicant's* tier, so the visibility roles are
 * computed per ticket by StaffSupportService and written as extra overwrites.
 * An unset support role also makes the panel administrator-only by default,
 * which is the safe base to add to.
 */
export const staffSupportPanel: TicketPanelConfig = {
  id: StaffSupportWorkflow.STAFF_SUPPORT,
  name: "دعم الستاف",
  description: "تواصل مع الإدارة",
  hidden: true,

  supportRoleId: UNSET_ID,
  categoryId: staffSupportConfig.staffSupportCategoryId,

  questions: { enabled: false, items: [] },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: true,
    onlyOnce: true,
    transferable: false,
  },

  close: { transcript: true, delete: false },

  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.primary,
    text: ["طلب دعم ستاف. الإدارة راح ترد عليك هنا."],
  },
};

export const demissionPanel: TicketPanelConfig = {
  id: StaffSupportWorkflow.DEMISSION_APPLY,
  name: "طلب استقالة",
  description: "تقديم استقالة",
  hidden: true,

  supportRoleId: UNSET_ID,
  categoryId: staffSupportConfig.staffSupportCategoryId,

  questions: { enabled: false, items: [] },

  claimer: {
    supportRoleCanClaim: true,
    managersCanClaim: true,
    onlyOnce: true,
    transferable: false,
  },

  close: { transcript: true, delete: false },

  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.warning,
    text: ["طلب استقالة. الإدارة راح تراجع الطلب."],
  },
};
