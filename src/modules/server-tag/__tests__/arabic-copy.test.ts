import { describe, expect, it } from "bun:test";
import {
  formatArabicDays,
  formatArabicDuration,
  formatArabicHours,
  formatArabicMinutes,
} from "../../../data/server-tag/duration.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import { branding } from "../../../data/config/branding.ts";
import { buildServerTagLog } from "../render/log.ts";
import { StaffTagRestorationReason } from "../types/enums.ts";

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
      M.dm.restoredByExpiry,
      M.dm.partialRestoreNote,
    ];
    for (const text of dmStrings) {
      expect(/[☀-➿\u{1F300}-\u{1FAFF}]/u.test(text)).toBe(false);
    }
  });
});

describe("log card rendering", () => {
  const USER = "123456789";
  const ROLE_A = "role-a";
  const ROLE_B = "role-b";

  it("renders a restriction card as heading + labelled lines", () => {
    const expiresAt = new Date("2026-01-04T00:00:00.000Z");
    const card = buildServerTagLog({
      kind: "RESTRICTED",
      userId: USER,
      savedRoleIds: [ROLE_A, ROLE_B],
      removedRoleIds: [ROLE_A, ROLE_B],
      blockedRoleIds: [],
      durationMs: 3 * DAY,
      expiresAt,
    });

    const lines = card.split("\n");
    expect(lines[0]).toBe(M.log.headings.restricted);

    for (const line of lines.slice(1)) expect(line).toMatch(/^\*\*[^*]+:\*\* /);

    expect(card).toContain(`<@${USER}> (\`${USER}\`)`);
    expect(card).toContain("<@&role-a>، <@&role-b>");
    expect(card).toContain("3 أيام");
    expect(card).toContain(`<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`);
  });

  it("names the restoration reason in Arabic", () => {
    const card = buildServerTagLog({
      kind: "RESTORED",
      userId: USER,
      reason: StaffTagRestorationReason.TAG_REAPPLIED,
      restoredRoleIds: [ROLE_A],
      missingRoleIds: [],
      blockedRoleIds: [],
      failed: false,
    });

    expect(card).toContain(M.log.reasons.TAG_REAPPLIED);
    expect(card).toContain(M.log.results.done);
    expect(card).not.toContain("TAG_REAPPLIED");
  });

  it("reports a partial restore rather than claiming success", () => {
    const card = buildServerTagLog({
      kind: "RESTORED",
      userId: USER,
      reason: StaffTagRestorationReason.DURATION_EXPIRED,
      restoredRoleIds: [ROLE_A],
      missingRoleIds: [ROLE_B],
      blockedRoleIds: [],
      failed: false,
    });

    expect(card).toContain(M.log.labels.missingRoles);
    expect(card).toContain(M.log.results.partial);
  });

  it("translates the staff status on a blocked restore", () => {
    const card = buildServerTagLog({
      kind: "BLOCKED",
      userId: USER,
      staffStatus: "FIRED",
    });

    expect(card).toContain("مفصول");
    expect(card).not.toContain("FIRED");
  });

  it("falls back to the raw status when it has no Arabic label", () => {
    const card = buildServerTagLog({
      kind: "BLOCKED",
      userId: USER,
      staffStatus: "UNKNOWN",
    });
    expect(card).toContain("UNKNOWN");
  });

  it("renders an empty role list as the house em-dash placeholder", () => {
    const card = buildServerTagLog({
      kind: "RESTORED",
      userId: USER,
      reason: StaffTagRestorationReason.DURATION_EXPIRED,
      restoredRoleIds: [],
      missingRoleIds: [],
      blockedRoleIds: [],
      failed: true,
    });
    expect(card).toContain(`**${M.log.labels.restoredRoles}:** —`);
    expect(card).toContain(M.log.results.restoreFailed);
  });

  it("omits the tag-role lines when no tag role is configured", () => {
    const card = buildServerTagLog({ kind: "TAG_ENABLED", userId: USER, tagRoleId: null });
    expect(card.split("\n")).toHaveLength(2);
    expect(card).toContain(M.log.headings.tagEnabled);
  });
});
