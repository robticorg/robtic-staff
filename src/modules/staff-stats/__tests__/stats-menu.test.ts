import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { StaffTier } from "../../configuration/types/enums.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { MENU_VIEWS, StatsView, parseStatsCustomId } from "../handlers/component-ids.ts";
import {
  buildApplicationView,
  buildStatsOverviewCard,
  buildWeeklyPointsView,
  overviewLines,
} from "../render/stats-card.ts";
import { StaffExitKind, type StaffCardOverview } from "../services/staff-card.service.ts";

type Json = {
  type: number;
  custom_id?: string;
  content?: string;
  options?: { value: string; label: string; description?: string; default?: boolean }[];
  components?: Json[];
};
const flat = (n: Json): Json[] => [n, ...(n.components ?? []).flatMap(flat)];
const BUTTON = 2;
const SELECT = 3;
const ids = { viewerId: "1", targetId: "2" };

// Serialising runs discord.js' validation, the same check a real reply would fail on.
const nodes = (message: { components?: unknown }) =>
  (message.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));

const overview = (fired: StaffCardOverview["fired"]): StaffCardOverview => ({
  userId: "2",
  avatarUrl: null,
  status: fired ? StaffStatus.FIRED : StaffStatus.ACTIVE,
  level: 3,
  roleId: "r3",
  tier: StaffTier.STAFF,
  staffType: null,
  acceptedBy: "9",
  acceptedAt: new Date(0),
  fired,
  totalPoints: 10,
  breakPoints: 0,
});

describe("!stats dropdown", () => {
  it("replaces the buttons with one menu: every view with a title and description", () => {
    const all = nodes(buildStatsOverviewCard(ids, overview(null)));
    expect(all.filter((n) => n.type === BUTTON)).toHaveLength(0);
    const menus = all.filter((n) => n.type === SELECT);
    expect(menus).toHaveLength(1);
    expect(menus[0]!.options!.map((o) => o.value)).toEqual([...MENU_VIEWS]);
    for (const option of menus[0]!.options!) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description?.length ?? 0).toBeGreaterThan(0);
    }
    expect(parseStatsCustomId(menus[0]!.custom_id!)?.view).toBe(StatsView.MENU);
  });

  it("marks the page being shown in the menu", () => {
    const menu = nodes(buildStatsOverviewCard(ids, overview(null))).find((n) => n.type === SELECT)!;
    expect(menu.options!.find((o) => o.default)?.value).toBe(StatsView.HOME);
  });

  it("keeps Previous/Next on the weekly pages next to the menu", () => {
    const all = nodes(buildWeeklyPointsView(ids, { totalPoints: 0, weeks: [], page: 1, pages: 2 }));
    expect(all.filter((n) => n.type === BUTTON)).toHaveLength(2);
    expect(all.filter((n) => n.type === SELECT)).toHaveLength(1);
  });
});

describe("fired vs resigned", () => {
  const exit = (kind: StaffExitKind, reason: string | null = null) => ({
    kind,
    by: "5",
    at: new Date(0),
    level: 2,
    roleId: "r2",
    reason,
  });

  it("says مطرود for a firing", () => {
    const lines = overviewLines(overview(exit(StaffExitKind.FIRED))).join("\n");
    expect(lines).toContain("مطرود");
    expect(lines).toContain("طرده");
  });

  it("says مستقيل with the approver and reason for a resignation", () => {
    const lines = overviewLines(overview(exit(StaffExitKind.DEMISSION, "دراسة"))).join("\n");
    expect(lines).toContain("مستقيل");
    expect(lines).toContain("وافق على استقالته");
    expect(lines).toContain("دراسة");
    expect(lines).not.toContain("طرده");
  });
});

describe("application view", () => {
  it("shows what they filled in when applying", () => {
    const text = JSON.stringify(
      nodes(
        buildApplicationView(ids, [
          {
            type: "NORMAL_APPLICATION",
            applicationStatus: "ACCEPTED",
            createdAt: new Date(0),
            name: "Ahmed",
            age: 19,
            city: "Riyadh",
            gender: "MALE",
            department: "STAFF",
            acceptedBy: "9",
            acceptedLevel: 0,
          },
        ]),
      ),
    );
    expect(text).toContain("Ahmed");
    expect(text).toContain("19");
    expect(text).toContain("Riyadh");
    expect(text).toContain("<@9>");
  });

  it("says so when there's no application", () => {
    expect(() => nodes(buildApplicationView(ids, []))).not.toThrow();
  });
});
