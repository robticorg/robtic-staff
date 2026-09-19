export {
  RoleConfigType,
  ROLE_CONFIG_TYPE_VALUES,
  NUMBERED_ROLE_TYPES,
  SINGLETON_ROLE_TYPES,
} from "../../modules/configuration/types/enums.ts";

import { RoleConfigType } from "../../modules/configuration/types/enums.ts";

export const ROLE_SLOT_LABELS: Record<RoleConfigType, string> = {
  [RoleConfigType.START]: "رتبة بداية الستاف",
  [RoleConfigType.END]: "رتبة نهاية الستاف",
  [RoleConfigType.STAFF]: "رتبة الستاف العامة",
  [RoleConfigType.IGNORE]: "الرتبة المستثناة",
  [RoleConfigType.ACCESS]: "رتبة وصول للستاف",
  [RoleConfigType.ACCEPTED]: "رتبة قبول الستاف",
  [RoleConfigType.ASSIGN]: "رتبة تلقائية حسب المستوى",
  [RoleConfigType.STAFF_TYPE]: "رتبة نوع الستاف",
  [RoleConfigType.BLACKLIST]: "رتبة البلاك ليست",
  [RoleConfigType.STAFF_MANAGER]: "رتبة مانجر الستاف",
  [RoleConfigType.OWNER_MANAGER]: "رتبة مانجر الأونر",
  [RoleConfigType.TRANSFER_MANAGER]: "رتبة مانجر التحويل",
  [RoleConfigType.WARN_1]: "رتبة تحذير الستاف 1",
  [RoleConfigType.WARN_2]: "رتبة تحذير الستاف 2",
  [RoleConfigType.WARN_3]: "رتبة تحذير الستاف 3",
  [RoleConfigType.OWNER_WARN_1]: "رتبة تحذير الأونر 1",
  [RoleConfigType.OWNER_WARN_2]: "رتبة تحذير الأونر 2",
  [RoleConfigType.OWNER_WARN_3]: "رتبة تحذير الأونر 3",
  [RoleConfigType.MUTE]: "رتبة الميوت",
  [RoleConfigType.JAIL]: "رتبة السجن",
  [RoleConfigType.CHAT_MANAGER]: "رتبة مانجر الشات",
  [RoleConfigType.VACATION]: "رتبة الإجازة",
  [RoleConfigType.APPEAL_MANAGER]: "رتبة مانجر الاستئناف",
  [RoleConfigType.GIFT_MANAGER]: "رتبة مانجر الهدايا",
  [RoleConfigType.APPLY_MANAGER]: "رتبة مانجر التقديم",
  [RoleConfigType.TAG]: "رتبة التاق",
};

/**
 * Every slot `/role set type:<…> role:@role` can write, in dropdown order.
 * Discord caps a choice list at 25, so this list has deliberate headroom — the
 * two lists that grow on their own (staff tiers, staff types) stay separate.
 */
export const ROLE_SET_SLOTS: readonly RoleConfigType[] = [
  RoleConfigType.START,
  RoleConfigType.END,
  RoleConfigType.STAFF,
  RoleConfigType.IGNORE,
  RoleConfigType.BLACKLIST,
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.OWNER_MANAGER,
  RoleConfigType.TRANSFER_MANAGER,
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.VACATION,
  RoleConfigType.TAG,
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
  RoleConfigType.OWNER_WARN_1,
  RoleConfigType.OWNER_WARN_2,
  RoleConfigType.OWNER_WARN_3,
];

/** Slots that take a level range rather than a single role — `/role range`. */
export const ROLE_RANGE_SLOTS: readonly RoleConfigType[] = [
  RoleConfigType.ACCEPTED,
  RoleConfigType.ASSIGN,
  RoleConfigType.ACCESS,
];

export const OWNER_WARN_SLOTS: readonly RoleConfigType[] = [
  RoleConfigType.OWNER_WARN_1,
  RoleConfigType.OWNER_WARN_2,
  RoleConfigType.OWNER_WARN_3,
];

const toChoices = (slots: readonly RoleConfigType[]) =>
  slots.map((type) => ({ name: ROLE_SLOT_LABELS[type], value: type as string }));

export const ROLE_SET_CHOICES = toChoices(ROLE_SET_SLOTS);
export const ROLE_RANGE_CHOICES = toChoices(ROLE_RANGE_SLOTS);
