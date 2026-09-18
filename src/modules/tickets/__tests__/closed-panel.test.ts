import { describe, expect, it } from "bun:test";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { buildClosedTicketPanel } from "../render/closed-panel.ts";
import { TicketCustomId } from "../handlers/component-ids.ts";

const P = ticketMessages.closedPanel;

const ticket = {
  ticketId: "T-42",
  userId: "owner-1",
  claimedByDiscordId: "staff-1",
  closedBy: "staff-1",
  closedAt: new Date("2026-02-01T10:00:00.000Z"),
  transcriptId: "TR-7",
};

function walk(options: { components?: readonly unknown[] }): {
  text: string;
  customIds: string[];
} {
  const parts: string[] = [];
  const customIds: string[] = [];

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const data = (node as { data?: Record<string, unknown> }).data ?? node;
    const content = (data as { content?: unknown }).content;
    if (typeof content === "string") parts.push(content);
    const customId = (data as { custom_id?: unknown }).custom_id;
    if (typeof customId === "string") customIds.push(customId);
    const children = (node as { components?: unknown[] }).components;
    if (Array.isArray(children)) for (const child of children) visit(child);
  };
  for (const component of options.components ?? []) visit(component);

  return { text: parts.join("\n"), customIds };
}

describe("closed-ticket panel", () => {
  it("carries exactly the transcript, reopen and delete buttons", () => {
    const { customIds } = walk(buildClosedTicketPanel(ticket));
    expect(customIds).toEqual([
      TicketCustomId.closedTranscript("T-42"),
      TicketCustomId.closedReopen("T-42"),
      TicketCustomId.closedDelete("T-42"),
    ]);
  });

  it("names the ticket, its owner, its handler and the saved transcript", () => {
    const { text } = walk(buildClosedTicketPanel(ticket));
    expect(text).toContain("T-42");
    expect(text).toContain("<@owner-1>");
    expect(text).toContain("<@staff-1>");
    expect(text).toContain("TR-7");
  });

  it("falls back to the em-dash when the ticket was never claimed or transcribed", () => {
    const { text } = walk(
      buildClosedTicketPanel({ ticketId: "T-43", userId: "owner-2" }),
    );
    expect(text).toContain(P.handlerNone);
    expect(text).toContain(P.transcriptNone);
  });

  it("is a Components V2 message that pings nobody", () => {
    const options = buildClosedTicketPanel(ticket) as {
      content?: string;
      flags?: number;
      allowedMentions?: { parse?: unknown[] };
    };
    expect(options.content).toBeUndefined();
    expect(options.flags).toBe(1 << 15);
    expect(options.allowedMentions?.parse).toEqual([]);
  });
});
