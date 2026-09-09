import { describe, expect, it } from "bun:test";
import { limits } from "../../../data/config/limits.ts";
import { tickets } from "../../../data/tickets/index.ts";
import { buildTicketPanelMessage } from "../render/panel-message.ts";
import { buildQuestionModal } from "../render/question-modal.ts";
import { shouldShowFaqMenu } from "../render/ticket-message.ts";
import { ticketConfigService } from "../services/ticket-config.service.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";

describe("ticket panel is fully config-driven", () => {
  it("the select menu has exactly one option per configured panel", () => {
    const json = JSON.stringify(buildTicketPanelMessage(tickets.main, tickets.panels));
    const optionCount = (json.match(/"value":"/g) ?? []).length;
    expect(optionCount).toBe(tickets.panels.length);
  });

  it("select option label/description/value come from the panel data", () => {
    const json = JSON.stringify(buildTicketPanelMessage(tickets.main, tickets.panels));
    for (const panel of tickets.panels) {
      expect(json).toContain(`"value":"${panel.id}"`);
      expect(json).toContain(panel.name);
    }
  });

  it("getPanel works for every configured id and nothing else (no branching)", () => {
    for (const panel of tickets.panels) {
      expect(ticketConfigService.getPanel(panel.id)?.id).toBe(panel.id);
    }
    expect(ticketConfigService.getPanel("does-not-exist")).toBeUndefined();
  });
});

describe("question paging respects the Discord modal limit", () => {
  const make = (n: number): TicketPanelConfig => ({
    ...tickets.panels[0]!,
    id: "x",
    questions: {
      enabled: true,
      items: Array.from({ length: n }, (_, i) => ({
        id: `q${i}`,
        label: `Q${i}`,
        style: "SHORT" as const,
      })),
    },
  });

  it("splits >5 questions into pages of at most 5", () => {
    const panel = make(12);
    const pages = ticketConfigService.questionPageCount(panel);
    expect(pages).toBe(3);
    for (let p = 1; p <= pages; p++) {
      expect(ticketConfigService.questionsForPage(panel, p).length).toBeLessThanOrEqual(
        limits.ticketQuestionsPerModal,
      );
    }

    const seen = new Set<string>();
    for (let p = 1; p <= pages; p++) {
      for (const q of ticketConfigService.questionsForPage(panel, p)) seen.add(q.id);
    }
    expect(seen.size).toBe(12);
  });

  it("a built modal never exceeds the row limit", () => {
    const modal = buildQuestionModal(make(9), 1).toJSON();
    expect(modal.components.length).toBeLessThanOrEqual(limits.ticketQuestionsPerModal);
  });

  it("0 pages when questions are disabled or empty", () => {
    expect(ticketConfigService.questionPageCount(make(0))).toBe(0);
    expect(
      ticketConfigService.questionPageCount({ ...make(3), questions: { enabled: false, items: [] } }),
    ).toBe(0);
  });
});

describe("shouldShowFaqMenu (spec §17)", () => {
  const on = { faq: { enabled: true } } as TicketPanelConfig;
  const off = { faq: { enabled: false } } as TicketPanelConfig;

  it("enabled + entries → shown", () => {
    expect(shouldShowFaqMenu(on, 3)).toBe(true);
  });
  it("enabled + zero entries → hidden", () => {
    expect(shouldShowFaqMenu(on, 0)).toBe(false);
  });
  it("disabled → hidden regardless of entries", () => {
    expect(shouldShowFaqMenu(off, 5)).toBe(false);
  });
});
