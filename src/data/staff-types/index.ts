import { StaffType } from "../../modules/staff/types/enums.ts";

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
    slug: "max",
    label: "ماكس",
    keywords: ["max", "ماكس"],
    description: "تحديد رتبة نوع الستاف: ماكس",
  },
  {
    id: StaffType.DEV,
    slug: "dev",
    label: "مبرمج",
    keywords: ["dev", "developer", "مبرمج", "ديف"],
    description: "تحديد رتبة نوع الستاف: مبرمج",
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
