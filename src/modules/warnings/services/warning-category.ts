import { RoleConfigType } from "../../configuration/types/enums.ts";
import { WarningCategory } from "../types/enums.ts";

const STAFF_WARN_ROLE_TYPES = {
  1: RoleConfigType.WARN_1,
  2: RoleConfigType.WARN_2,
  3: RoleConfigType.WARN_3,
} as const;

/** The warning roles. Owner warnings (and their roles) were removed: every category uses the staff roles. */
export function warnRoleTypes(
  _category: WarningCategory,
): Record<1 | 2 | 3, RoleConfigType> {
  return STAFF_WARN_ROLE_TYPES;
}

export function warningCategoryOf(
  doc: { category?: WarningCategory | null } | null | undefined,
): WarningCategory {
  return doc?.category ?? WarningCategory.STAFF;
}

export function categoryFilter(category: WarningCategory): Record<string, unknown> {
  return category === WarningCategory.OWNER
    ? { category: WarningCategory.OWNER }
    : { category: { $in: [WarningCategory.STAFF, null] } };
}

export const OTHER_CATEGORY: Record<WarningCategory, WarningCategory> = {
  [WarningCategory.STAFF]: WarningCategory.OWNER,
  [WarningCategory.OWNER]: WarningCategory.STAFF,
};
