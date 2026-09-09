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
  [ChannelConfigType.PUNISHMENT_LOG]: { label: "لوق العقوبات", group: "العقوبات" },
  [ChannelConfigType.BAN_APPROVAL]: { label: "موافقة الباند", group: "العقوبات" },
  [ChannelConfigType.KICK_APPROVAL]: { label: "موافقة الكيك", group: "العقوبات" },
  [ChannelConfigType.VACATION_REQUESTS]: { label: "طلبات الإجازات", group: "الستاف" },
  [ChannelConfigType.APPEALS]: { label: "الاستئنافات", group: "الاستئنافات" },
  [ChannelConfigType.GIFT_CLAIMS]: { label: "طلبات الهدايا", group: "المكافآت" },
  [ChannelConfigType.SUPPORT]: { label: "الدعم", group: "الدعم" },
};

export const CHANNEL_GROUP_ORDER: readonly string[] = [
  "البلاغات",
  "التحذيرات",
  "العقوبات",
  "الستاف",
  "الاستئنافات",
  "المكافآت",
  "الدعم",
];

export const CHANNEL_TYPE_CHOICES = CHANNEL_CONFIG_TYPE_VALUES.map((value) => ({
  name: CHANNEL_SLOT_META[value].label,
  value,
}));
