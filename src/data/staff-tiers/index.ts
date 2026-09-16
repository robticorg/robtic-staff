import { StaffTier } from "../../modules/configuration/types/enums.ts";

export interface StaffTierKeywords {
  tier: StaffTier;

  slug: string;
  keywords: readonly string[];
}

export const STAFF_TIER_KEYWORD_DEFINITIONS: readonly StaffTierKeywords[] = [
  {
    tier: StaffTier.HIGHSTAFF,
    slug: "high",
    keywords: ["high", "highstaff", "عليا", "هاي"],
  },
  {
    tier: StaffTier.OWNER,
    slug: "owner",
    keywords: ["owner", "اونر", "أونر"],
  },
  {
    tier: StaffTier.SHIP,
    slug: "ship",
    keywords: ["ship", "شيب"],
  },
];

export const STAFF_TIER_BY_KEYWORD: ReadonlyMap<string, StaffTier> = (() => {
  const map = new Map<string, StaffTier>();
  for (const definition of STAFF_TIER_KEYWORD_DEFINITIONS) {
    for (const keyword of definition.keywords) {
      const key = keyword.toLowerCase();
      const clash = map.get(key);
      if (clash && clash !== definition.tier) {
        throw new Error(
          `Staff Tier keyword "${keyword}" is claimed by both ${clash} and ${definition.tier}`,
        );
      }
      map.set(key, definition.tier);
    }
  }
  return map;
})();

export const STAFF_TIER_SLUGS: readonly string[] = STAFF_TIER_KEYWORD_DEFINITIONS.map(
  (d) => d.slug,
);

export function resolveTierKeyword(keyword: string): StaffTier | null {
  return STAFF_TIER_BY_KEYWORD.get(keyword.trim().toLowerCase()) ?? null;
}
