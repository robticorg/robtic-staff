import { describe, expect, it } from "bun:test";
import {
  formatArabicDays,
  formatArabicDuration,
  formatArabicHours,
  formatArabicMinutes,
} from "../../../data/server-tag/duration.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import { branding } from "../../../data/config/branding.ts";

const DAY = 86_400_000;
const M = serverTagMessages;

describe("Arabic pluralisation", () => {
  it("uses the singular, dual, and broken-plural forms for days", () => {
    expect(formatArabicDays(1)).toBe("يوم");
    expect(formatArabicDays(2)).toBe("يومين");
    expect(formatArabicDays(3)).toBe("3 أيام");
    expect(formatArabicDays(10)).toBe("10 أيام");

    expect(formatArabicDays(11)).toBe("11 يوم");
  });

  it("applies the same rules to hours and minutes", () => {
    expect(formatArabicHours(1)).toBe("ساعة");
    expect(formatArabicHours(2)).toBe("ساعتين");
    expect(formatArabicHours(5)).toBe("5 ساعات");
    expect(formatArabicMinutes(1)).toBe("دقيقة");
    expect(formatArabicMinutes(2)).toBe("دقيقتين");
    expect(formatArabicMinutes(30)).toBe("30 دقيقة");
  });

  it("picks a sensible unit for the configured window", () => {
    expect(formatArabicDuration(3 * DAY)).toBe("3 أيام");
    expect(formatArabicDuration(DAY)).toBe("يوم");
    expect(formatArabicDuration(2 * 3_600_000)).toBe("ساعتين");
    expect(formatArabicDuration(60_000)).toBe("دقيقة");

    expect(formatArabicDuration(0)).toBe("دقيقة");
  });
});

describe("Arabic copy hygiene", () => {
  const collect = (value: unknown, out: string[] = []): string[] => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") {
    } else if (value && typeof value === "object") {
      for (const v of Object.values(value)) collect(v, out);
    }
    return out;
  };

  it("contains no leftover English prose in user-facing strings", () => {
    const strings = collect(M);

    const offenders = strings.filter((s) => {
      const withoutCode = s
        .replace(/`[^`]*`/g, "")
        .replace(/\*\*[^*]*\*\*/g, "")
        .replaceAll(branding.communityName, "")
        .replaceAll(branding.botName, "");
      return /[A-Za-z]{4,}/.test(withoutCode);
    });
    expect(offenders).toEqual([]);
  });

  it("keeps every DM free of emoji, matching the project's DM style", () => {
    const dmStrings = [
      M.dm.restricted(3 * DAY, new Date()),
      M.dm.restoredByTag,
      M.dm.removedByExpiry,
      M.dm.partialRestoreNote,
    ];
    for (const text of dmStrings) {
      expect(/[☀-➿\u{1F300}-\u{1FAFF}]/u.test(text)).toBe(false);
    }
  });
});
