import { describe, expect, it } from "bun:test";
import { AcceptArgProblem, parseAcceptArguments } from "../_shared/accept-args.ts";
import { StaffType } from "../../../modules/staff/types/enums.ts";
import {
  STAFF_TYPE_BY_KEYWORD,
  STAFF_TYPE_DEFINITIONS,
} from "../../../data/staff-types/index.ts";
import {
  STAFF_TIER_BY_KEYWORD,
  STAFF_TIER_KEYWORD_DEFINITIONS,
  resolveTierKeyword,
} from "../../../data/staff-tiers/index.ts";
import { StaffTier } from "../../../modules/configuration/types/enums.ts";

const USER = "123456789012345678";
const MENTION = `<@${USER}>`;

const args = (line: string) => line.trim().split(/\s+/).filter(Boolean);

describe("parseAcceptArguments", () => {
  it("keeps plain acceptance working", () => {
    expect(parseAcceptArguments(args(MENTION), USER)).toEqual({
      level: null,
      staffType: null,
      tier: null,
    });
  });

  it("keeps acceptance with a level working", () => {
    expect(parseAcceptArguments(args(`${MENTION} 3`), USER)).toEqual({
      level: 3,
      staffType: null,
      tier: null,
    });
  });

  it("reads level 0 rather than treating it as absent", () => {
    expect(parseAcceptArguments(args(`${MENTION} 0`), USER).level).toBe(0);
  });

  it("reads an English type keyword", () => {
    expect(parseAcceptArguments(args(`${MENTION} max`), USER)).toEqual({
      level: null,
      staffType: StaffType.MAX,
      tier: null,
    });
    expect(parseAcceptArguments(args(`${MENTION} dev`), USER).staffType).toBe(StaffType.DEV);
  });

  it("maps Arabic keywords onto the same internal ids", () => {
    expect(parseAcceptArguments(args(`${MENTION} ماكس`), USER).staffType).toBe(StaffType.MAX);
    expect(parseAcceptArguments(args(`${MENTION} مبرمج`), USER).staffType).toBe(StaffType.DEV);
  });

  it("is case-insensitive for English keywords", () => {
    for (const written of ["MAX", "Max", "mAx"]) {
      expect(parseAcceptArguments(args(`${MENTION} ${written}`), USER).staffType).toBe(
        StaffType.MAX,
      );
    }
  });

  it("accepts type then level", () => {
    expect(parseAcceptArguments(args(`${MENTION} max 3`), USER)).toEqual({
      level: 3,
      staffType: StaffType.MAX,
      tier: null,
    });
    expect(parseAcceptArguments(args(`${MENTION} dev 5`), USER)).toEqual({
      level: 5,
      staffType: StaffType.DEV,
      tier: null,
    });
  });

  it("accepts level then type", () => {
    expect(parseAcceptArguments(args(`${MENTION} 3 max`), USER)).toEqual({
      level: 3,
      staffType: StaffType.MAX,
      tier: null,
    });
    expect(parseAcceptArguments(args(`${MENTION} 5 dev`), USER)).toEqual({
      level: 5,
      staffType: StaffType.DEV,
      tier: null,
    });
  });

  it("accepts an Arabic keyword together with a level, either order", () => {
    expect(parseAcceptArguments(args(`${MENTION} ماكس 3`), USER)).toEqual({
      level: 3,
      staffType: StaffType.MAX,
      tier: null,
    });
    expect(parseAcceptArguments(args(`${MENTION} 3 مبرمج`), USER)).toEqual({
      level: 3,
      staffType: StaffType.DEV,
      tier: null,
    });
  });

  it("ignores the target in every mention form", () => {
    for (const form of [MENTION, `<@!${USER}>`, USER]) {
      expect(parseAcceptArguments(args(`${form} 3`), USER)).toEqual({
        level: 3,
        staffType: null,
        tier: null,
      });
    }
  });

  it("does not mistake a bare target id for a level", () => {
    expect(parseAcceptArguments([USER], USER).level).toBeNull();
  });

  it("ignores an unrelated user mention rather than failing", () => {
    expect(parseAcceptArguments(args(`${MENTION} <@999888777666555444> 2`), USER)).toEqual({
      level: 2,
      staffType: null,
      tier: null,
    });
  });

  it("rejects an unknown keyword instead of ignoring it", () => {
    const result = parseAcceptArguments(args(`${MENTION} something`), USER);
    expect(result.problem).toBe(AcceptArgProblem.UNKNOWN_TOKEN);
    expect(result.token).toBe("something");
  });

  it("rejects a misspelled type rather than accepting with no type", () => {
    expect(parseAcceptArguments(args(`${MENTION} mxa 3`), USER).problem).toBe(
      AcceptArgProblem.UNKNOWN_TOKEN,
    );
  });

  it("rejects two levels and two different types", () => {
    expect(parseAcceptArguments(args(`${MENTION} 2 3`), USER).problem).toBe(
      AcceptArgProblem.DUPLICATE_LEVEL,
    );
    expect(parseAcceptArguments(args(`${MENTION} max dev`), USER).problem).toBe(
      AcceptArgProblem.DUPLICATE_TYPE,
    );
  });

  it("tolerates the same type twice", () => {
    expect(parseAcceptArguments(args(`${MENTION} max ماكس`), USER).staffType).toBe(StaffType.MAX);
  });

  it("reads the English tier keywords", () => {
    expect(parseAcceptArguments(args(`${MENTION} ship`), USER).tier).toBe(StaffTier.SHIP);
    expect(parseAcceptArguments(args(`${MENTION} owner`), USER).tier).toBe(StaffTier.OWNER);
    expect(parseAcceptArguments(args(`${MENTION} high`), USER).tier).toBe(StaffTier.HIGHSTAFF);
  });

  it("maps the Arabic tier keywords onto the same tiers", () => {
    expect(parseAcceptArguments(args(`${MENTION} شيب`), USER).tier).toBe(StaffTier.SHIP);
    expect(parseAcceptArguments(args(`${MENTION} اونر`), USER).tier).toBe(StaffTier.OWNER);
    expect(parseAcceptArguments(args(`${MENTION} عليا`), USER).tier).toBe(StaffTier.HIGHSTAFF);
  });

  it("leaves the level unset — the tier resolves it later", () => {
    const parsed = parseAcceptArguments(args(`${MENTION} ship`), USER);
    expect(parsed.level).toBeNull();
    expect(parsed.staffType).toBeNull();
  });

  it("combines a tier with a staff type, either order", () => {
    expect(parseAcceptArguments(args(`${MENTION} ship dev`), USER)).toEqual({
      level: null,
      staffType: StaffType.DEV,
      tier: StaffTier.SHIP,
    });
    expect(parseAcceptArguments(args(`${MENTION} مبرمج عليا`), USER)).toEqual({
      level: null,
      staffType: StaffType.DEV,
      tier: StaffTier.HIGHSTAFF,
    });
  });

  it("rejects a tier together with an explicit level, either order", () => {
    expect(parseAcceptArguments(args(`${MENTION} ship 3`), USER).problem).toBe(
      AcceptArgProblem.LEVEL_AND_TIER,
    );
    expect(parseAcceptArguments(args(`${MENTION} 3 ship`), USER).problem).toBe(
      AcceptArgProblem.LEVEL_AND_TIER,
    );
  });

  it("rejects two different tiers but tolerates the same one twice", () => {
    expect(parseAcceptArguments(args(`${MENTION} ship owner`), USER).problem).toBe(
      AcceptArgProblem.DUPLICATE_TIER,
    );
    expect(parseAcceptArguments(args(`${MENTION} ship شيب`), USER).tier).toBe(StaffTier.SHIP);
  });

  it("is case-insensitive for English tier keywords", () => {
    for (const written of ["SHIP", "Ship", "sHiP"]) {
      expect(parseAcceptArguments(args(`${MENTION} ${written}`), USER).tier).toBe(StaffTier.SHIP);
    }
  });
});

describe("Staff Tier registry", () => {
  it("has no keyword shared with a Staff Type", () => {
    for (const keyword of STAFF_TIER_BY_KEYWORD.keys()) {
      expect(STAFF_TYPE_BY_KEYWORD.has(keyword)).toBe(false);
    }
  });

  it("resolves every configured keyword and rejects unknown ones", () => {
    for (const definition of STAFF_TIER_KEYWORD_DEFINITIONS) {
      for (const keyword of definition.keywords) {
        expect(resolveTierKeyword(keyword)).toBe(definition.tier);
      }
      expect(definition.keywords).toContain(definition.slug);
    }
    expect(resolveTierKeyword("emperor")).toBeNull();
  });

  it("does not claim a keyword for the implicit STAFF tier", () => {
    expect(resolveTierKeyword("staff")).toBeNull();
  });
});

describe("Staff Type registry", () => {
  it("exposes every declared type with a unique slug", () => {
    const slugs = STAFF_TYPE_DEFINITIONS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("includes each definition's own slug among its keywords", () => {
    for (const definition of STAFF_TYPE_DEFINITIONS) {
      expect(definition.keywords).toContain(definition.slug);
    }
  });

  it("stores internal ids, never Arabic keywords", () => {
    for (const [keyword, id] of STAFF_TYPE_BY_KEYWORD) {
      expect(id).toMatch(/^[A-Z_]+$/);
      expect(keyword).toBe(keyword.toLowerCase());
    }
  });

  it("resolves every configured keyword", () => {
    for (const definition of STAFF_TYPE_DEFINITIONS) {
      for (const keyword of definition.keywords) {
        expect(STAFF_TYPE_BY_KEYWORD.get(keyword)).toBe(definition.id);
      }
    }
  });
});
