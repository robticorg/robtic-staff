import { describe, expect, it } from "bun:test";
import type { ContainerBuilder } from "discord.js";
import { buildTicketInfoCard } from "../render/ticket-info.ts";
import { buildTicketTopic } from "../render/ticket-topic.ts";
import { TicketLogAction, TicketStatus } from "../types/enums.ts";

const opened = new Date("2026-09-30T10:00:00Z");
const claimed = new Date("2026-09-30T10:05:00Z");
const handed = new Date("2026-09-30T11:00:00Z");
const ts = (d: Date) => Math.floor(d.getTime() / 1000);

describe("ticket topic", () => {
  it("says unclaimed while nobody has claimed it", () => {
    const topic = buildTicketTopic({ userId: "1", createdAt: opened }, "Support");
    expect(topic).toBe(
      `🎫 This ticket was opened by <@1> for **Support**. It was opened at **<t:${ts(opened)}:d> • <t:${ts(opened)}:t>** and is currently **unclaimed**.`,
    );
  });

  it("names the claimer and claim time once claimed", () => {
    const topic = buildTicketTopic(
      { userId: "1", createdAt: opened, claimedByDiscordId: "2", claimedAt: claimed },
      "Support",
    );
    expect(topic).toEndWith(`and claimed by <@2> at **<t:${ts(claimed)}:d> • <t:${ts(claimed)}:t>**.`);
  });

  it("keeps the first claimer and adds who it was handed over to", () => {
    const topic = buildTicketTopic(
      {
        userId: "1",
        createdAt: opened,
        claimedByDiscordId: "3",
        claimedAt: handed,
        firstClaimedByDiscordId: "2",
        firstClaimedAt: claimed,
        transferredFrom: "2",
        transferredAt: handed,
      },
      "Support",
    );
    expect(topic).toContain(`claimed by <@2> at **<t:${ts(claimed)}:d>`);
    expect(topic).toEndWith(`then handed over to <@3> at **<t:${ts(handed)}:d> • <t:${ts(handed)}:t>**.`);
  });

  it("stays within Discord's 1024-character topic limit", () => {
    expect(buildTicketTopic({ userId: "1", createdAt: opened }, "x".repeat(2000)).length).toBeLessThanOrEqual(1024);
  });
});

describe("!ticket info card", () => {
  const base = {
    ticketId: "ticket-9",
    userId: "1",
    status: TicketStatus.CLAIMED,
    createdAt: opened,
    answers: [{ questionId: "q", question: "What's wrong?", answer: "Can't log in" }],
    claimedByDiscordId: "3",
    claimedAt: handed,
    firstClaimedByDiscordId: "2",
    firstClaimedAt: claimed,
    transferredFrom: "2",
    transferredAt: handed,
    transferReason: "shift ended",
    addedUsers: ["4"],
    addedRoles: [],
    events: [
      { action: TicketLogAction.TICKET_CLAIMED, actorId: "2", at: claimed },
      { action: "COMMAND", actorId: "2", detail: "!handover @3 shift ended", at: handed },
    ],
  };

  const text = () =>
    JSON.stringify((buildTicketInfoCard(base, "Support").components as ContainerBuilder[]).map((c) => c.toJSON()));

  it("renders valid V2 with the answers, both claimers, the handover and the history", () => {
    const json = text();
    expect(json).toContain("Can't log in");
    expect(json).toContain("<@3>");
    expect(json).toContain("<@2>");
    expect(json).toContain("shift ended");
    expect(json).toContain("!handover @3 shift ended");
  });

  it("never pings anyone", () => {
    expect(buildTicketInfoCard(base, "Support").allowedMentions).toEqual({ parse: [] });
  });
});
