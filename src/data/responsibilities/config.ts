import { RoleConfigType } from "../../modules/configuration/types/enums.ts";
import { ResponsibilityCategory } from "../../modules/responsibilities/types/enums.ts";

export const RESPONSIBILITY_PERMISSIONS: readonly RoleConfigType[] = [
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.OWNER_MANAGER,
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.TRANSFER_MANAGER,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIRLS_MANAGER,
  RoleConfigType.DEVELOPER_MANAGER,
  RoleConfigType.DESIGNER_MANAGER,
  RoleConfigType.EDITOR_MANAGER,
];

export const RESPONSIBILITY_PERMISSION_LABELS: Readonly<Record<string, string>> = {
  [RoleConfigType.STAFF_MANAGER]: "إدارة الطاقم الاداري",
  [RoleConfigType.OWNER_MANAGER]: "إدارة الأونر",
  [RoleConfigType.APPLY_MANAGER]: "إدارة التقديم",
  [RoleConfigType.TRANSFER_MANAGER]: "إدارة النقل",
  [RoleConfigType.CHAT_MANAGER]: "إدارة الشات",
  [RoleConfigType.GIFT_MANAGER]: "إدارة الجوائز",
  [RoleConfigType.APPEAL_MANAGER]: "إدارة الاستئنافات",
  [RoleConfigType.GIRLS_MANAGER]: "إدارة البنات",
  [RoleConfigType.DEVELOPER_MANAGER]: "إدارة المبرمجين",
  [RoleConfigType.DESIGNER_MANAGER]: "إدارة المصممين",
  [RoleConfigType.EDITOR_MANAGER]: "إدارة المونتيرية",
};

const DEPARTMENT_PERMISSIONS: readonly RoleConfigType[] = [
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.TRANSFER_MANAGER,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIRLS_MANAGER,
  RoleConfigType.DEVELOPER_MANAGER,
  RoleConfigType.DESIGNER_MANAGER,
  RoleConfigType.EDITOR_MANAGER,
];

export const RESPONSIBILITY_ASSIGNERS: Readonly<Partial<Record<RoleConfigType, readonly RoleConfigType[]>>> = {
  [RoleConfigType.OWNER_MANAGER]: [RoleConfigType.STAFF_MANAGER, ...DEPARTMENT_PERMISSIONS],
  [RoleConfigType.STAFF_MANAGER]: DEPARTMENT_PERMISSIONS,
};

export const RESPONSIBILITY_CATEGORY_ORDER: readonly ResponsibilityCategory[] = [
  ResponsibilityCategory.STAFF,
  ResponsibilityCategory.TICKETS,
  ResponsibilityCategory.APPLICATIONS,
  ResponsibilityCategory.MODERATION,
  ResponsibilityCategory.COMMUNITY,
  ResponsibilityCategory.EVENTS,
  ResponsibilityCategory.DEVELOPMENT,
  ResponsibilityCategory.OTHER,
];

export const RESPONSIBILITY_CATEGORY_LABELS: Readonly<Record<ResponsibilityCategory, string>> = {
  [ResponsibilityCategory.STAFF]: "الطاقم الاداري",
  [ResponsibilityCategory.TICKETS]: "التكتات",
  [ResponsibilityCategory.APPLICATIONS]: "التقديم",
  [ResponsibilityCategory.MODERATION]: "الإشراف",
  [ResponsibilityCategory.COMMUNITY]: "المجتمع",
  [ResponsibilityCategory.EVENTS]: "الفعاليات",
  [ResponsibilityCategory.DEVELOPMENT]: "التطوير",
  [ResponsibilityCategory.OTHER]: "أخرى",
};

export const responsibilityLimits = {
  titleMaxLength: 80,
  descriptionMaxLength: 200,
  menuDescriptionMaxLength: 100,
  menuMaxOptions: 25,
  maxDurationMs: 365 * 86_400_000,
  sweepIntervalMs: 60_000,
  sweepBatchSize: 50,
  permissionCacheTtlMs: 60_000,
} as const;
