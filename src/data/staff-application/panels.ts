import { colors } from "../config/colors.ts";
import { UNSET_ID, type TicketPanelConfig } from "../tickets/types.ts";
import {
  ChannelConfigType,
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
  ticketPrefix: "apply",
  name: "التقديم او النقل الى طاقم الاداري",
  description: "قدّم على فريق الاداري أو انقل خبرتك من سيرفر ثاني.",

  supportRoleId: UNSET_ID,
  supportRoleOptional: true,
  independent: true,
  blacklistSlot: RoleConfigType.BLACKLIST,
  fastAccessContext: FastAccessContext.STAFF_APPLICATION,
  categorySlot: ChannelConfigType.APPLICATION_CATEGORY,

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
  ticketPrefix: "transfer",
  name: "نقل إلى الادارة",
  description: "طلب نقل من سيرفر ثاني.",
  hidden: true,

  supportRoleId: UNSET_ID,
  supportRoleOptional: true,
  independent: true,
  blacklistSlot: RoleConfigType.BLACKLIST,
  fastAccessContext: FastAccessContext.STAFF_TRANSFER,
  categorySlot: ChannelConfigType.TRANSFER_CATEGORY,

  questions: { enabled: false, items: [] },
  claimer,
  close: { transcript: true, delete: true },
  faq: { enabled: false },

  ticketMessage: {
    accentColor: colors.primary,
    text: ["تم فتح طلب نقل جديد.\nبانتظار أحد مسؤولي النقل لاستلام الطلب."],
  },
};
