import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { staffInfoPanelContent } from "../../../data/staff-info/config.ts";
import { parseStaffInfoCustomId, StaffInfoCustomId } from "../handlers/component-ids.ts";
import { buildInfoAddModal, buildInfoEditModal, buildInfoPageModal } from "../render/modals.ts";
import { buildStaffInfoPanel } from "../render/panel.ts";
import { buildInfoPage, clampPage } from "../render/viewer.ts";

type Json = { type: number; components?: Json[]; accent_color?: number; custom_id?: string; disabled?: boolean; items?: unknown[] };

// discord.js validates when serialising — the same point a reply would throw.
const render = (msg: { components?: unknown }) =>
  (msg.components as ContainerBuilder[]).map((c) => c.toJSON() as unknown as Json);

const flat = (nodes: Json[]): Json[] => nodes.flatMap((n) => [n, ...flat(n.components ?? [])]);
const BUTTON = 2;
const SELECT = 3;
const MEDIA_GALLERY = 12;

const entry = (n: number) => ({ infoId: `id${n}`, name: `Info ${n}`, description: `Desc ${n}` });

describe("staff info panel", () => {
  it("is valid with no infos, one, or the full 25 — and has no accent colour", () => {
    for (const count of [0, 1, 25]) {
      const [container] = render(buildStaffInfoPanel(Array.from({ length: count }, (_, i) => entry(i))));
      expect(container!.accent_color).toBeUndefined();
      const selects = flat([container!]).filter((n) => n.type === SELECT);
      expect(selects).toHaveLength(count === 0 ? 0 : 1);
    }
  });

  it("puts the banner image first when one is configured", () => {
    const original = staffInfoPanelContent.image;
    try {
      staffInfoPanelContent.image = "https://example.com/banner.png";
      const [container] = render(buildStaffInfoPanel([entry(1)]));
      expect(container!.components![0]!.type).toBe(MEDIA_GALLERY);
    } finally {
      staffInfoPanelContent.image = original;
    }
  });
});

describe("staff info viewer", () => {
  it("shows no buttons for a single page", () => {
    const nodes = flat(render(buildInfoPage({ infoId: "x", name: "Rules", pages: ["one"] }, 1)));
    expect(nodes.filter((n) => n.type === BUTTON)).toHaveLength(0);
  });

  it("shows السابق/التالي, disabled at the ends", () => {
    const info = { infoId: "x", name: "Rules", pages: ["one", "two", "three"] };
    const buttons = (page: number) => flat(render(buildInfoPage(info, page))).filter((n) => n.type === BUTTON);

    expect(buttons(1).map((b) => b.disabled)).toEqual([true, false]);
    expect(buttons(2).map((b) => b.disabled)).toEqual([false, false]);
    expect(buttons(3).map((b) => b.disabled)).toEqual([false, true]);
    expect(buttons(2).map((b) => parseStaffInfoCustomId(b.custom_id!)?.args)).toEqual([
      ["x", "1"],
      ["x", "3"],
    ]);
  });

  it("clamps pages that no longer exist (a page deleted while open)", () => {
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(Number.NaN, 3)).toBe(1);
  });

  it("pre-fills the edit form with the page's current content", () => {
    const json = buildInfoEditModal("abc", 2, "old text").toJSON() as unknown as {
      custom_id: string;
      components: { component: { value?: string } }[];
    };
    expect(json.components[0]!.component.value).toBe("old text");
    expect(parseStaffInfoCustomId(json.custom_id)).toEqual({ action: "editModal", args: ["abc", "2"] });
    // A page at the 4000-char limit still fits in the form.
    expect(() => buildInfoEditModal("abc", 1, "x".repeat(5000)).toJSON()).not.toThrow();
  });

  it("builds valid forms", () => {
    expect(() => buildInfoAddModal().toJSON()).not.toThrow();
    expect(() => buildInfoPageModal("abc").toJSON()).not.toThrow();
    expect(parseStaffInfoCustomId(StaffInfoCustomId.pageModal("abc"))).toEqual({
      action: "pageModal",
      args: ["abc"],
    });
  });
});
