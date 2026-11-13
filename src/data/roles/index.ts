export {
  RoleConfigType,
  ROLE_CONFIG_TYPE_VALUES,
  NUMBERED_ROLE_TYPES,
  SINGLETON_ROLE_TYPES,
} from "../../modules/configuration/types/enums.ts";

import { RoleConfigType } from "../../modules/configuration/types/enums.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

export const ROLE_SLOT_LABELS: Record<RoleConfigType, string> = bilingual<Record<RoleConfigType, string>>(
  {
    [RoleConfigType.START]: "Staff start role",
    [RoleConfigType.END]: "Staff end role",
    [RoleConfigType.STAFF]: "General staff role",
    [RoleConfigType.IGNORE]: "Ignored role",
    [RoleConfigType.ACCESS]: "Staff access role",
    [RoleConfigType.ACCEPTED]: "Staff accepted role",
    [RoleConfigType.ASSIGN]: "Automatic role by level",
    [RoleConfigType.STAFF_TYPE]: "Staff type role",
    [RoleConfigType.BLACKLIST]: "Staff blacklist role",
    [RoleConfigType.STAFF_MANAGER]: "Staff manager role",
    [RoleConfigType.OWNER_MANAGER]: "Owner manager role",
    [RoleConfigType.TRANSFER_MANAGER]: "Transfer manager role",
    [RoleConfigType.WARN_1]: "Staff warning 1 role",
    [RoleConfigType.WARN_2]: "Staff warning 2 role",
    [RoleConfigType.WARN_3]: "Staff warning 3 role",
    [RoleConfigType.OWNER_WARN_1]: "Owner warning 1 role",
    [RoleConfigType.OWNER_WARN_2]: "Owner warning 2 role",
    [RoleConfigType.OWNER_WARN_3]: "Owner warning 3 role",
    [RoleConfigType.MUTE]: "Mute role",
    [RoleConfigType.JAIL]: "Jail role",
    [RoleConfigType.CHAT_MANAGER]: "Chat manager role",
    [RoleConfigType.VACATION]: "Vacation role",
    [RoleConfigType.APPEAL_MANAGER]: "Appeals manager role",
    [RoleConfigType.GIFT_MANAGER]: "Gift manager role",
    [RoleConfigType.APPLY_MANAGER]: "Applications manager role",
    [RoleConfigType.DEVELOPER_MANAGER]: "Developers manager role",
    [RoleConfigType.DESIGNER_MANAGER]: "Designers manager role",
    [RoleConfigType.EDITOR_MANAGER]: "Editors manager role",
    [RoleConfigType.GIRLS_MANAGER]: "Girls staff role",
    [RoleConfigType.GIRL_NOT_VERIFIED]: "Unverified girl role",
    [RoleConfigType.GIRL_VERIFIED]: "Verified girl role",
    [RoleConfigType.TICKET_BLACKLIST]: "Ticket blacklist role",
    [RoleConfigType.GIFT_BLACKLIST]: "Gift blacklist role",
    [RoleConfigType.TAG]: "Tag role",
  },
  {
    [RoleConfigType.START]: "رتبة بداية الطاقم",
    [RoleConfigType.END]: "رتبة نهاية الطاقم",
    [RoleConfigType.STAFF]: "رتبة الطاقم العامة",
    [RoleConfigType.IGNORE]: "الرتبة المستثناة",
    [RoleConfigType.ACCESS]: "رتبة وصول للطاقم الاداري",
    [RoleConfigType.ACCEPTED]: "رتبة قبول الطاقم",
    [RoleConfigType.ASSIGN]: "رتبة تلقائية حسب المستوى",
    [RoleConfigType.STAFF_TYPE]: "رتبة نوع الطاقم",
    [RoleConfigType.BLACKLIST]: "رتبة بلاك ليست الطاقم",
    [RoleConfigType.STAFF_MANAGER]: "رتبة مانجر الطاقم",
    [RoleConfigType.OWNER_MANAGER]: "رتبة مانجر الأونر",
    [RoleConfigType.TRANSFER_MANAGER]: "رتبة مانجر التحويل",
    [RoleConfigType.WARN_1]: "رتبة تحذير الطاقم 1",
    [RoleConfigType.WARN_2]: "رتبة تحذير الطاقم 2",
    [RoleConfigType.WARN_3]: "رتبة تحذير الطاقم 3",
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
    [RoleConfigType.DEVELOPER_MANAGER]: "رتبة مانجر المبرمجين",
    [RoleConfigType.DESIGNER_MANAGER]: "رتبة مانجر المصممين",
    [RoleConfigType.EDITOR_MANAGER]: "رتبة مانجر المونتيرية",
    [RoleConfigType.GIRLS_MANAGER]: "رتبة إدارة البنات",
    [RoleConfigType.GIRL_NOT_VERIFIED]: "رتبة بنت غير موثقة",
    [RoleConfigType.GIRL_VERIFIED]: "رتبة بنت موثقة",
    [RoleConfigType.TICKET_BLACKLIST]: "رتبة بلاك ليست التكتات",
    [RoleConfigType.GIFT_BLACKLIST]: "رتبة بلاك ليست الهدايا",
    [RoleConfigType.TAG]: "رتبة التاق",
  },
);

/**
 * Every slot `/role set type:<…> role:@role` can write, in suggestion order.
 * The list is served through autocomplete, so it is not bound by Discord's
 * 25-choice cap; the two lists that grow on their own stay separate.
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
  RoleConfigType.DEVELOPER_MANAGER,
  RoleConfigType.DESIGNER_MANAGER,
  RoleConfigType.EDITOR_MANAGER,
  RoleConfigType.GIRLS_MANAGER,
  RoleConfigType.GIRL_NOT_VERIFIED,
  RoleConfigType.GIRL_VERIFIED,
  RoleConfigType.TICKET_BLACKLIST,
  RoleConfigType.GIFT_BLACKLIST,
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
