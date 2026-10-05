import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { isStaffTicket } from "../../../commands/prefix/_shared/staff-ticket.ts";
import { buildGiftClaimCaseCard } from "../render/case-card.ts";
import { routeGiftCommand } from "../services/delivery/gift-command.service.ts";
import { extractCreditAmount, parseCreditAmount } from "../services/delivery/gift-delivery-input.ts";
import { GiftClaimSource, GiftClaimStatus } from "../types/enums.ts";

describe("credit amounts", () => {
  it("reads k, m and b suffixes", () => {
    expect(parseCreditAmount("50k")).toBe("50000");
    expect(parseCreditAmount("50m")).toBe("50000000");
    expect(parseCreditAmount("50M")).toBe("50000000");
    expect(parseCreditAmount("1.5m")).toBe("1500000");
    expect(parseCreditAmount("2b")).toBe("2000000000");
  });

  it("reads Arabic words and digits", () => {
    expect(parseCreditAmount("مليون")).toBe("1000000");
    expect(parseCreditAmount("50 مليون")).toBe("50000000");
    expect(parseCreditAmount("٥٠ ألف")).toBe("50000");
    expect(parseCreditAmount("50 الف")).toBe("50000");
    expect(parseCreditAmount("٥٠م")).toBe("50000000");
    expect(parseCreditAmount("3 ملايين")).toBe("3000000");
  });

  it("keeps plain numbers and separators working", () => {
    expect(parseCreditAmount("500000")).toBe("500000");
    expect(parseCreditAmount("5,000,000")).toBe("5000000");
    expect(parseCreditAmount("٥٠٠٠٠٠")).toBe("500000");
  });

  it("rejects junk, zero and fractions of a credit", () => {
    for (const raw of ["", "abc", "0", "0k", "50x", "1.0005k", "1.5", "-5"]) {
      expect(parseCreditAmount(raw)).toBeNull();
    }
  });

  it("finds the amount inside a note", () => {
    expect(extractCreditAmount("50m عيدية")).toBe("50000000");
    expect(extractCreditAmount("جائزة 50 مليون")).toBe("50000000");
    expect(extractCreditAmount("جائزة الفعالية")).toBeNull();
    expect(extractCreditAmount(null)).toBeNull();
  });
});

describe("!gift routing", () => {
  const ticket = { ticketId: "t-1", ownerId: "owner" };

  it("in a ticket, administrators gift the owner directly without a mention", () => {
    expect(routeGiftCommand({ ticket, isAdministrator: true }, null)).toEqual({
      kind: "TICKET",
      userId: "owner",
      ticketId: "t-1",
    });
  });

  it("in a ticket, other staff send an order for the owner with the ticket number", () => {
    expect(routeGiftCommand({ ticket, isAdministrator: false }, null)).toEqual({
      kind: "REQUEST",
      userId: "owner",
      ticketId: "t-1",
    });
    expect(routeGiftCommand({ ticket, isAdministrator: false }, "owner").userId).toBe("owner");
  });

  it("in a ticket, refuses anyone else — even for administrators", () => {
    expect(() => routeGiftCommand({ ticket, isAdministrator: false }, "someone")).toThrow();
    expect(() => routeGiftCommand({ ticket, isAdministrator: true }, "someone")).toThrow();
  });

  it("outside a ticket, administrators give directly and staff send an order", () => {
    expect(routeGiftCommand({ ticket: null, isAdministrator: true }, "u")).toEqual({ kind: "DIRECT", userId: "u" });
    expect(routeGiftCommand({ ticket: null, isAdministrator: false }, "u")).toEqual({
      kind: "REQUEST",
      userId: "u",
      ticketId: null,
    });
  });

  it("outside a ticket, needs a mention", () => {
    expect(() => routeGiftCommand({ ticket: null, isAdministrator: true }, null)).toThrow();
  });
});

describe("!transfer staff tickets", () => {
  const base = { guildId: "g", status: "OPEN" };

  it("accepts open staff application and transfer tickets only", () => {
    expect(isStaffTicket({ ...base, panelId: "staff-application" }, "g")).toBe(true);
    expect(isStaffTicket({ ...base, panelId: "staff-transfer-application" }, "g")).toBe(true);
    expect(isStaffTicket({ ...base, panelId: "support" }, "g")).toBe(false);
    expect(isStaffTicket({ ...base, panelId: "staff-application", status: "CLOSED" }, "g")).toBe(false);
    expect(isStaffTicket({ ...base, panelId: "staff-application" }, "other")).toBe(false);
    expect(isStaffTicket(null, "g")).toBe(false);
  });
});

describe("staff gift request card", () => {
  type Json = { type: number; content?: string; disabled?: boolean; style?: number; url?: string; label?: string; components?: Json[] };
  const LINK_STYLE = 5;

  it("shows the ticket number and links to the ticket", () => {
    const card = buildGiftClaimCaseCard({
      claimId: "c2",
      guildId: "g1",
      userId: "u",
      rewardName: "50m",
      status: GiftClaimStatus.PENDING,
      proof: [],
      source: GiftClaimSource.REQUEST,
      requestedBy: "staff",
      ticketId: "ticket-12",
      originChannelId: "ch-12",
    });
    const nodes = (card.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
    expect(nodes.map((n) => n.content ?? "").join("\n")).toContain("ticket-12");
    const link = nodes.find((n) => n.type === 2 && n.style === LINK_STYLE);
    expect(link?.url).toBe("https://discord.com/channels/g1/ch-12");
    expect(link?.label).toBe("الذهاب للتكت");
  });

  it("links to the channel when the order was not made in a ticket", () => {
    const card = buildGiftClaimCaseCard({
      claimId: "c3",
      guildId: "g1",
      userId: "u",
      rewardName: "x",
      status: GiftClaimStatus.PENDING,
      proof: [],
      source: GiftClaimSource.REQUEST,
      originChannelId: "general",
    });
    const nodes = (card.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
    expect(nodes.find((n) => n.style === LINK_STYLE)?.label).toBe("الذهاب للروم");
  });
  const flat = (n: Json): Json[] => [n, ...(n.components ?? []).flatMap(flat)];

  it("shows who asked, with approve and reject buttons, and no empty proof block", () => {
    const card = buildGiftClaimCaseCard({
      claimId: "c1",
      userId: "u",
      rewardName: "50m",
      prize: "50m",
      status: GiftClaimStatus.PENDING,
      proof: [],
      source: GiftClaimSource.REQUEST,
      requestedBy: "staff",
    });
    const nodes = (card.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
    const text = nodes.map((n) => n.content ?? "").join("\n");
    expect(text).toContain("<@staff>");
    expect(text).toContain("طلب هدية من الطاقم الاداري");
    expect(text).not.toContain("إثبات الفوز");
    expect(nodes.filter((n) => n.type === 2 && !n.disabled && n.style !== LINK_STYLE)).toHaveLength(2);
  });
});
