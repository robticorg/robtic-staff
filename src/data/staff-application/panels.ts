import { colors } from "../config/colors.ts";
import { UNSET_ID, type TicketPanelConfig } from "../tickets/types.ts";
import {
  FastAccessContext,
  RoleConfigType,
} from "../../modules/configuration/types/enums.ts";
import { staffApplicationConfig } from "./config.ts";

export const StaffApplicationWorkflow = {
  STAFF_APPLICATION: "staff-application",
  STAFF_TRANSFER_APPLICATION: "staff-transfer-application",
} as const;
export type StaffApplicationWorkflow =
  (typeof StaffApplicationWorkflow)[keyof typeof StaffApplicationWorkflow];

const claimer = {
  supportRoleCanClaim: false,
  managersCanClaim: false,
  onlyOnce: true,
  transferable: false,
} as const;

export const staffApplicationPanel: TicketPanelConfig = {
  id: StaffApplicationWorkflow.STAFF_APPLICATION,
  name: "التقديم أو النقل إلى الستاف",
  description: "قدّم على فريق الستاف أو انقل خبرتك من سيرفر ثاني.",

  supportRoleId: UNSET_ID,
  blacklistSlot: RoleConfigType.BLACKLIST,
  fastAccessContext: FastAccessContext.STAFF_APPLICATION,
  categoryId: staffApplicationConfig.applicationCategoryId,
  logChannelId: "1536249123265581056",

  questions: { enabled: false, items: [] },
  claimer,
  close: { transcript: true, delete: true },
  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.primary,
    text: ["تم فتح طلب تقديم جديد.\nبانتظار أحد المسؤولين لاستلام الطلب."],
  },
};

export const staffTransferApplicationPanel: TicketPanelConfig = {
  id: StaffApplicationWorkflow.STAFF_TRANSFER_APPLICATION,
  name: "نقل إلى الستاف",
  description: "طلب نقل من سيرفر ثاني.",
  hidden: true,

  supportRoleId: UNSET_ID,
  blacklistSlot: RoleConfigType.BLACKLIST,
  fastAccessContext: FastAccessContext.STAFF_TRANSFER,
  categoryId: staffApplicationConfig.transferCategoryId,

  questions: { enabled: false, items: [] },
  claimer,
  close: { transcript: true, delete: true },
  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.primary,
    text: ["تم فتح طلب نقل جديد.\nبانتظار أحد مسؤولي النقل لاستلام الطلب."],
  },
};
