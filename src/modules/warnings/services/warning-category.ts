import { RoleConfigType } from "../../configuration/types/enums.ts";
import { WarningCategory } from "../types/enums.ts";

/**
 * Which warning ladder a target belongs to, from their calculated Staff level
 * and the configured tier boundaries. Never from a Discord role position, and
 * never chosen by the manager issuing the warning.
 *
 * Ship tier resolves to OWNER as well: there is no third role set, and only an
 * Administrator can warn a Ship member anyway (enforced by `canWarn`).
 */
export function decideWarningCategory(
  targetLevel: number,
  ownerStartLevel: number | null,
): WarningCategory {
  // No Owner boundary configured means there is no Owner tier to warn — the
  // whole server is on the normal ladder.
  if (ownerStartLevel === null) return WarningCategory.STAFF;
  return targetLevel >= ownerStartLevel ? WarningCategory.OWNER : WarningCategory.STAFF;
}

const STAFF_WARN_ROLE_TYPES = {
  1: RoleConfigType.WARN_1,
  2: RoleConfigType.WARN_2,
  3: RoleConfigType.WARN_3,
} as const;

const OWNER_WARN_ROLE_TYPES = {
  1: RoleConfigType.OWNER_WARN_1,
  2: RoleConfigType.OWNER_WARN_2,
  3: RoleConfigType.OWNER_WARN_3,
} as const;

/** The three RoleConfig slots that hold this category's warning roles. */
export function warnRoleTypes(
  category: WarningCategory,
): Record<1 | 2 | 3, RoleConfigType> {
  return category === WarningCategory.OWNER ? OWNER_WARN_ROLE_TYPES : STAFF_WARN_ROLE_TYPES;
}

/** The category a stored row belongs to. Rows written before this feature are STAFF. */
export function warningCategoryOf(
  doc: { category?: WarningCategory | null } | null | undefined,
): WarningCategory {
  return doc?.category ?? WarningCategory.STAFF;
}

/**
 * Mongo filter for one category. STAFF also matches rows written before the
 * field existed: in MongoDB `{$in: [..., null]}` matches a missing field too,
 * so legacy warnings stay on the normal ladder instead of vanishing.
 */
export function categoryFilter(category: WarningCategory): Record<string, unknown> {
  return category === WarningCategory.OWNER
    ? { category: WarningCategory.OWNER }
    : { category: { $in: [WarningCategory.STAFF, null] } };
}

export const OTHER_CATEGORY: Record<WarningCategory, WarningCategory> = {
  [WarningCategory.STAFF]: WarningCategory.OWNER,
  [WarningCategory.OWNER]: WarningCategory.STAFF,
};
