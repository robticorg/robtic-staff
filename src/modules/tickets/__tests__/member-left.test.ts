import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { parseTicketCustomId } from "../handlers/component-ids.ts";
import { buildMemberLeftNotice } from "../render/member-left.ts";

type Json = { type: number; content?: string; custom_id?: string; components?: Json[] };
const flat = (n: Json): Json[] => [n, ...(n.components ?? []).flatMap(flat)];
const BUTTON = 2;

// Serialising runs discord.js' validation — the same check that would fail the send.
const render = (ticket: Parameters<typeof buildMemberLeftNotice>[0]) => {
  const message = buildMemberLeftNotice(ticket);
  const nodes = (message.components as ContainerBuilder[]).flatMap((c) => flat(c.toJSON() as unknown as Json));
  return { message, nodes };
};

describe("member left notice", () => {
  it("offers the ticket's normal close button", () => {
    const { nodes } = render({ ticketId: "ticket-7", userId: "111" });
    const buttons = nodes.filter((n) => n.type === BUTTON);
    expect(buttons).toHaveLength(1);
    expect(parseTicketCustomId(buttons[0]!.custom_id!)).toEqual({ action: "optClose", args: ["ticket-7"] });
  });

  it("names the member who left", () => {
    const { nodes } = render({ ticketId: "ticket-7", userId: "111" });
    expect(nodes.some((n) => n.content?.includes("<@111>"))).toBe(true);
  });

  it("pings only the claimer, and nobody when unclaimed", () => {
    expect(render({ ticketId: "t", userId: "111", claimedByDiscordId: "222" }).message.allowedMentions).toEqual({
      users: ["222"],
    });
    expect(render({ ticketId: "t", userId: "111" }).message.allowedMentions).toEqual({ parse: [] });
  });
});
