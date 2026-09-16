import { StaffType } from "../../modules/staff/types/enums.ts";

/**
 * The localization layer for Staff Types.
 *
 * Internal ids (MAX, DEV) are the only thing ever stored; every user-facing
 * word — English or Arabic — is an alias resolved through here. Adding a type
 * means adding one entry below plus one value in the StaffType enum: the
 * `/role` subcommand, the `!accept` keyword and the error text all derive from
 * this table.
 */
export interface StaffTypeDefinition {
  id: StaffType;
  /** Slash subcommand name — also the canonical English keyword. */
  slug: string;
  /** Arabic display label, used in confirmations and errors. */
  label: string;
  /** Every accepted keyword, lowercased. Must include `slug`. */
  keywords: readonly string[];
  /** Slash-command description for `/role <slug>`. */
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

/**
 * keyword → internal id. Built once; a duplicate keyword across two types is a
 * configuration mistake and would silently shadow, so it throws at load.
 */
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

/** The canonical English keywords, for "available types: max, dev" messages. */
export const STAFF_TYPE_SLUGS: readonly string[] = STAFF_TYPE_DEFINITIONS.map((d) => d.slug);

export const staffTypeLabel = (id: StaffType): string => STAFF_TYPE_BY_ID[id]?.label ?? id;
