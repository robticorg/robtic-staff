import { StaffType } from "../../modules/staff/types/enums.ts";
import { bilingual } from "../../shared/utils/lang-context.ts";

/** Labels in the server's language (the slugs stay as typed in commands). */
const TEXT = bilingual(
  { max: "Max", maxDescription: "Set the staff type role: Max", dev: "Developer", devDescription: "Set the staff type role: Developer" },
  { max: "ماكس", maxDescription: "تحديد رتبة نوع الإداري: ماكس", dev: "مبرمج", devDescription: "تحديد رتبة نوع الإداري: مبرمج" },
);

export interface StaffTypeDefinition {
  id: StaffType;

  slug: string;

  label: string;

  keywords: readonly string[];

  description: string;
}

export const STAFF_TYPE_DEFINITIONS: readonly StaffTypeDefinition[] = [
  {
    id: StaffType.MAX,
    slug: "ماكس",
    get label() { return TEXT.max; },
    // No keywords on purpose: "max" / "ماكس" in !accept means the END role of the
    // ladder (see MAX_LEVEL_KEYWORDS), not this separate type role.
    keywords: [],
    get description() { return TEXT.maxDescription; },
  },
  {
    id: StaffType.DEV,
    slug: "dev",
    get label() { return TEXT.dev; },
    keywords: ["dev", "developer", "مبرمج", "ديف"],
    get description() { return TEXT.devDescription; },
  },
];

export const STAFF_TYPE_BY_ID: Record<StaffType, StaffTypeDefinition> = Object.fromEntries(
  STAFF_TYPE_DEFINITIONS.map((d) => [d.id, d]),
) as Record<StaffType, StaffTypeDefinition>;

export const STAFF_TYPE_BY_KEYWORD: ReadonlyMap<string, StaffType> = (() => {
  const map = new Map<string, StaffType>();
  for (const definition of STAFF_TYPE_DEFINITIONS) {
    for (const keyword of definition.keywords) {
      const key = keyword.toLowerCase();
      const clash = map.get(key);
      if (clash && clash !== definition.id) {
        throw new Error(
          `Staff Type keyword "${keyword}" is claimed by both ${clash} and ${definition.id}`,
        );
      }
      map.set(key, definition.id);
    }
  }
  return map;
})();

export const STAFF_TYPE_SLUGS: readonly string[] = STAFF_TYPE_DEFINITIONS.map((d) => d.slug);

export const staffTypeLabel = (id: StaffType): string => STAFF_TYPE_BY_ID[id]?.label ?? id;
