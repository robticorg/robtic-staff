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
  [RoleConfigType.MUTE]: "رتبة الميوت",
  [RoleConfigType.JAIL]: "رتبة السجن",
  [RoleConfigType.CHAT_MANAGER]: "رتبة مانجر الشات",
  [RoleConfigType.VACATION]: "رتبة الإجازة",
  [RoleConfigType.APPEAL_MANAGER]: "رتبة مانجر الاستئناف",
  [RoleConfigType.GIFT_MANAGER]: "رتبة مانجر الهدايا",
  [RoleConfigType.APPLY_MANAGER]: "رتبة مانجر التقديم",
  [RoleConfigType.TAG]: "رتبة التاق",
};
