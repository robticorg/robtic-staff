export {
  ChannelConfigType,
  CHANNEL_CONFIG_TYPE_VALUES,
} from "../../modules/configuration/types/enums.ts";

import {
  CHANNEL_CONFIG_TYPE_VALUES,
  ChannelConfigType,
} from "../../modules/configuration/types/enums.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

export interface ChannelSlotMeta {
  label: string;

  group: string;
}

// Groups by name, in the server's language (CHANNEL_GROUP_ORDER below uses the same names).
const G = {
  en: { reports: "Reports", warns: "Warnings", punish: "Punishments", staff: "Staff", appeals: "Appeals", rewards: "Rewards", support: "Support", apply: "Applications", logs: "Logs" },
  ar: { reports: "البلاغات", warns: "التحذيرات", punish: "العقوبات", staff: "الطاقم", appeals: "الاستئنافات", rewards: "المكافآت", support: "الدعم", apply: "التقديم", logs: "اللوقات" },
};

type Meta = Record<ChannelConfigType, ChannelSlotMeta>;
const meta = (g: typeof G.en, l: Record<ChannelConfigType, string>): Meta => ({
  [ChannelConfigType.REPORTS]: { label: l[ChannelConfigType.REPORTS], group: g.reports },
  [ChannelConfigType.REPORT_LOG]: { label: l[ChannelConfigType.REPORT_LOG], group: g.reports },
  [ChannelConfigType.USER_WARNS]: { label: l[ChannelConfigType.USER_WARNS], group: g.warns },
  [ChannelConfigType.STAFF_WARNS]: { label: l[ChannelConfigType.STAFF_WARNS], group: g.warns },
  [ChannelConfigType.WARNING_LOG]: { label: l[ChannelConfigType.WARNING_LOG], group: g.warns },
  [ChannelConfigType.STAFF_WARN_ANNOUNCE]: { label: l[ChannelConfigType.STAFF_WARN_ANNOUNCE], group: g.warns },
  [ChannelConfigType.WARN_PANEL]: { label: l[ChannelConfigType.WARN_PANEL], group: g.warns },
  [ChannelConfigType.PUNISHMENT_LOG]: { label: l[ChannelConfigType.PUNISHMENT_LOG], group: g.punish },
  [ChannelConfigType.BAN_APPROVAL]: { label: l[ChannelConfigType.BAN_APPROVAL], group: g.punish },
  [ChannelConfigType.KICK_APPROVAL]: { label: l[ChannelConfigType.KICK_APPROVAL], group: g.punish },
  [ChannelConfigType.VACATION_REQUESTS]: { label: l[ChannelConfigType.VACATION_REQUESTS], group: g.staff },
  [ChannelConfigType.APPEALS]: { label: l[ChannelConfigType.APPEALS], group: g.appeals },
  [ChannelConfigType.GIFT_CLAIMS]: { label: l[ChannelConfigType.GIFT_CLAIMS], group: g.rewards },
  [ChannelConfigType.SUPPORT]: { label: l[ChannelConfigType.SUPPORT], group: g.support },
  [ChannelConfigType.APPLICATION_CATEGORY]: { label: l[ChannelConfigType.APPLICATION_CATEGORY], group: g.apply },
  [ChannelConfigType.TRANSFER_CATEGORY]: { label: l[ChannelConfigType.TRANSFER_CATEGORY], group: g.apply },
  [ChannelConfigType.GIFT_DELIVERIES]: { label: l[ChannelConfigType.GIFT_DELIVERIES], group: g.rewards },
  [ChannelConfigType.GIFT_DELIVERY_LOG]: { label: l[ChannelConfigType.GIFT_DELIVERY_LOG], group: g.rewards },
  [ChannelConfigType.GIFT_DELIVERY_CATEGORY]: { label: l[ChannelConfigType.GIFT_DELIVERY_CATEGORY], group: g.rewards },
  [ChannelConfigType.COMMAND_LOG]: { label: l[ChannelConfigType.COMMAND_LOG], group: g.logs },
  [ChannelConfigType.JAIL_LOG]: { label: l[ChannelConfigType.JAIL_LOG], group: g.logs },
  [ChannelConfigType.STAFF_LOG]: { label: l[ChannelConfigType.STAFF_LOG], group: g.logs },
  [ChannelConfigType.WARN_COMMAND_LOG]: { label: l[ChannelConfigType.WARN_COMMAND_LOG], group: g.logs },
  [ChannelConfigType.TICKET_LOG]: { label: l[ChannelConfigType.TICKET_LOG], group: g.logs },
  [ChannelConfigType.TICKET_TRANSCRIPTS]: { label: l[ChannelConfigType.TICKET_TRANSCRIPTS], group: g.logs },
});

export const CHANNEL_SLOT_META: Meta = bilingual<Meta>(
  meta(G.en, {
    [ChannelConfigType.REPORTS]: "Reports channel",
    [ChannelConfigType.REPORT_LOG]: "Reports log",
    [ChannelConfigType.USER_WARNS]: "Member warnings",
    [ChannelConfigType.STAFF_WARNS]: "Staff warnings",
    [ChannelConfigType.WARNING_LOG]: "Warnings log",
    [ChannelConfigType.STAFF_WARN_ANNOUNCE]: "Staff warning announcements",
    [ChannelConfigType.WARN_PANEL]: "Punishments panel",
    [ChannelConfigType.PUNISHMENT_LOG]: "Punishments log",
    [ChannelConfigType.BAN_APPROVAL]: "Ban approvals",
    [ChannelConfigType.KICK_APPROVAL]: "Kick approvals",
    [ChannelConfigType.VACATION_REQUESTS]: "Vacation requests",
    [ChannelConfigType.APPEALS]: "Appeals",
    [ChannelConfigType.GIFT_CLAIMS]: "Gift claims",
    [ChannelConfigType.SUPPORT]: "Support",
    [ChannelConfigType.APPLICATION_CATEGORY]: "Applications category",
    [ChannelConfigType.TRANSFER_CATEGORY]: "Transfers category",
    [ChannelConfigType.GIFT_DELIVERIES]: "Gift deliveries channel",
    [ChannelConfigType.GIFT_DELIVERY_LOG]: "Gift deliveries log",
    [ChannelConfigType.GIFT_DELIVERY_CATEGORY]: "Gift deliveries category",
    [ChannelConfigType.COMMAND_LOG]: "Commands log (general)",
    [ChannelConfigType.JAIL_LOG]: "Jail log",
    [ChannelConfigType.STAFF_LOG]: "Staff commands log",
    [ChannelConfigType.WARN_COMMAND_LOG]: "Warning commands log",
    [ChannelConfigType.TICKET_LOG]: "Ticket commands log",
    [ChannelConfigType.TICKET_TRANSCRIPTS]: "Ticket transcripts",
  }),
  meta(G.ar, {
    [ChannelConfigType.REPORTS]: "روم البلاغات",
    [ChannelConfigType.REPORT_LOG]: "لوق البلاغات",
    [ChannelConfigType.USER_WARNS]: "تحذيرات الأعضاء",
    [ChannelConfigType.STAFF_WARNS]: "تحذيرات الطاقم",
    [ChannelConfigType.WARNING_LOG]: "لوق التحذيرات",
    [ChannelConfigType.STAFF_WARN_ANNOUNCE]: "إعلان تحذيرات الطاقم",
    [ChannelConfigType.WARN_PANEL]: "لوحة العقوبات",
    [ChannelConfigType.PUNISHMENT_LOG]: "لوق العقوبات",
    [ChannelConfigType.BAN_APPROVAL]: "موافقة الباند",
    [ChannelConfigType.KICK_APPROVAL]: "موافقة الكيك",
    [ChannelConfigType.VACATION_REQUESTS]: "طلبات الإجازات",
    [ChannelConfigType.APPEALS]: "الاستئنافات",
    [ChannelConfigType.GIFT_CLAIMS]: "طلبات الهدايا",
    [ChannelConfigType.SUPPORT]: "الدعم",
    [ChannelConfigType.APPLICATION_CATEGORY]: "كاتيقوري التقديم",
    [ChannelConfigType.TRANSFER_CATEGORY]: "كاتيقوري النقل",
    [ChannelConfigType.GIFT_DELIVERIES]: "روم تسليم الهدايا",
    [ChannelConfigType.GIFT_DELIVERY_LOG]: "لوق تسليم الهدايا",
    [ChannelConfigType.GIFT_DELIVERY_CATEGORY]: "كاتيقوري تسليم الهدايا",
    [ChannelConfigType.COMMAND_LOG]: "لوق الأوامر (العام)",
    [ChannelConfigType.JAIL_LOG]: "لوق السجن",
    [ChannelConfigType.STAFF_LOG]: "لوق أوامر الطاقم",
    [ChannelConfigType.WARN_COMMAND_LOG]: "لوق أوامر التحذير",
    [ChannelConfigType.TICKET_LOG]: "لوق أوامر التكتات",
    [ChannelConfigType.TICKET_TRANSCRIPTS]: "روم نسخ التكتات",
  }),
);

const order = (g: typeof G.en) => [g.reports, g.warns, g.punish, g.staff, g.appeals, g.rewards, g.support, g.apply, g.logs];
export const CHANNEL_GROUP_ORDER: readonly string[] = bilingual<string[]>(order(G.en), order(G.ar));

/** Built when the commands load (Arabic); registration sends the English with the Arabic as its localization. */
export const CHANNEL_TYPE_CHOICES = CHANNEL_CONFIG_TYPE_VALUES.map((value) => ({
  name: CHANNEL_SLOT_META[value].label,
  value,
}));
