export {
  ChannelConfigType,
  CHANNEL_CONFIG_TYPE_VALUES,
} from "../../modules/configuration/types/enums.ts";

import {
  CHANNEL_CONFIG_TYPE_VALUES,
  ChannelConfigType,
} from "../../modules/configuration/types/enums.ts";

export interface ChannelSlotMeta {
  label: string;

  group: string;
}

export const CHANNEL_SLOT_META: Record<ChannelConfigType, ChannelSlotMeta> = {
  [ChannelConfigType.REPORTS]: { label: "روم البلاغات", group: "البلاغات" },
  [ChannelConfigType.REPORT_LOG]: { label: "لوق البلاغات", group: "البلاغات" },
  [ChannelConfigType.USER_WARNS]: { label: "تحذيرات الأعضاء", group: "التحذيرات" },
  [ChannelConfigType.STAFF_WARNS]: { label: "تحذيرات الستاف", group: "التحذيرات" },
  [ChannelConfigType.WARNING_LOG]: { label: "لوق التحذيرات", group: "التحذيرات" },
  [ChannelConfigType.STAFF_WARN_ANNOUNCE]: {
    label: "إعلان تحذيرات الستاف",
    group: "التحذيرات",
  },
  [ChannelConfigType.WARN_PANEL]: {
    label: "لوحة إدارة العقوبات",
    group: "التحذيرات",
  },
  [ChannelConfigType.PUNISHMENT_LOG]: { label: "لوق العقوبات", group: "العقوبات" },
  [ChannelConfigType.BAN_APPROVAL]: { label: "موافقة الباند", group: "العقوبات" },
  [ChannelConfigType.KICK_APPROVAL]: { label: "موافقة الكيك", group: "العقوبات" },
  [ChannelConfigType.VACATION_REQUESTS]: { label: "طلبات الإجازات", group: "الستاف" },
  [ChannelConfigType.APPEALS]: { label: "الاستئنافات", group: "الاستئنافات" },
  [ChannelConfigType.GIFT_CLAIMS]: { label: "طلبات الهدايا", group: "المكافآت" },
  [ChannelConfigType.SUPPORT]: { label: "الدعم", group: "الدعم" },
  [ChannelConfigType.SERVER_TAG_LOG]: { label: "لوق تاق السيرفر", group: "الستاف" },
  [ChannelConfigType.APPLICATION_CATEGORY]: { label: "كاتيقوري التقديم", group: "التقديم" },
  [ChannelConfigType.TRANSFER_CATEGORY]: { label: "كاتيقوري النقل", group: "التقديم" },
  [ChannelConfigType.GIFT_DELIVERIES]: { label: "روم تسليم الهدايا", group: "المكافآت" },
  [ChannelConfigType.GIFT_DELIVERY_LOG]: { label: "لوق تسليم الهدايا", group: "المكافآت" },
  [ChannelConfigType.GIFT_DELIVERY_CATEGORY]: { label: "كاتيقوري تسليم الهدايا", group: "المكافآت" },
  [ChannelConfigType.COMMAND_LOG]: { label: "لوق الأوامر (العام)", group: "اللوقات" },
  [ChannelConfigType.JAIL_LOG]: { label: "لوق السجن", group: "اللوقات" },
  [ChannelConfigType.STAFF_LOG]: { label: "لوق أوامر الستاف", group: "اللوقات" },
  [ChannelConfigType.WARN_COMMAND_LOG]: { label: "لوق أوامر التحذير", group: "اللوقات" },
  [ChannelConfigType.TICKET_LOG]: { label: "لوق أوامر التكتات", group: "اللوقات" },
  [ChannelConfigType.TICKET_TRANSCRIPTS]: { label: "روم نسخ التكتات", group: "اللوقات" },
};

export const CHANNEL_GROUP_ORDER: readonly string[] = [
  "البلاغات",
  "التحذيرات",
  "العقوبات",
  "الستاف",
  "الاستئنافات",
  "المكافآت",
  "الدعم",
  "التقديم",
  "اللوقات",
];

export const CHANNEL_TYPE_CHOICES = CHANNEL_CONFIG_TYPE_VALUES.map((value) => ({
  name: CHANNEL_SLOT_META[value].label,
  value,
}));
