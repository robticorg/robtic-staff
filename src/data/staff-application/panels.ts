import { L, currentLang } from "../../shared/utils/lang-context.ts";
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
  get name() { return L("Apply or transfer to staff", "التقديم او النقل الى طاقم الاداري"); },
  get description() { return L("Join the staff team, or transfer from another server.", "قدّم على فريق الاداري أو انقل خبرتك من سيرفر ثاني."); },

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
    get text() { return currentLang() === "en" ? ["New application. Waiting for a manager to claim it."] : ["طلب تقديم جديد، بانتظار استلام أحد المسؤولين."]; },
  },
};

export const staffTransferApplicationPanel: TicketPanelConfig = {
  id: StaffApplicationWorkflow.STAFF_TRANSFER_APPLICATION,
  ticketPrefix: "transfer",
  get name() { return L("Transfer to staff", "نقل إلى الادارة"); },
  get description() { return L("Transfer from another server.", "طلب نقل من سيرفر ثاني."); },
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
    get text() { return currentLang() === "en" ? ["New transfer request. Waiting for a transfer manager to claim it."] : ["طلب نقل جديد، بانتظار استلام أحد مسؤولي النقل."]; },
  },
};
