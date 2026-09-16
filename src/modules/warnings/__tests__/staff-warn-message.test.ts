import { describe, expect, it } from "bun:test";
import {
  DISCORD_MESSAGE_LIMIT,
  formatStaffWarningMessage,
  formatVerbalStaffWarningMessage,
} from "../render/staff-warn-message.ts";

const ATTENTION = "<:Attention:1486103485756870726>";
const USER = "123456789";

describe("Staff Warn channel message format", () => {
  it("matches the specified format exactly for warn 1", () => {
    const message = formatStaffWarningMessage({
      level: 1,
      targetId: USER,
      reason: "عدم الالتزام بالقوانين",
      evidence: ["https://example.com/proof.png"],
    });

    expect(message).toBe(
      [
        `**Staff Warn 1 ${ATTENTION}**`,
        `**منشن : <@${USER}>**`,
        "**السبب : عدم الالتزام بالقوانين**",
        "**الدليل : https://example.com/proof.png**",
      ].join("\n"),
    );
  });

  it("renders warn 2 and warn 3 with the real level", () => {
    const two = formatStaffWarningMessage({
      level: 2,
      targetId: USER,
      reason: "تكرار المخالفة",
      evidence: ["https://example.com/proof.png"],
    });
    expect(two.split("\n")[0]).toBe(`**Staff Warn 2 ${ATTENTION}**`);

    const three = formatStaffWarningMessage({
      level: 3,
      targetId: USER,
      reason: "مخالفة خطيرة",
      evidence: [],
    });
    expect(three).toBe(
      [
        `**Staff Warn 3 ${ATTENTION}**`,
        `**منشن : <@${USER}>**`,
        "**السبب : مخالفة خطيرة**",
        "**الدليل : لا يوجد**",
      ].join("\n"),
    );
  });

  it("uses the exact custom emoji and no substitute", () => {
    const message = formatStaffWarningMessage({
      level: 1,
      targetId: USER,
      reason: "س",
      evidence: [],
    });
    expect(message).toContain(ATTENTION);
    for (const wrong of ["⚠️", "🚨", "❗", "⛔"]) {
      expect(message).not.toContain(wrong);
    }
  });

  it("is exactly four lines — no embed, no timestamp, no issuer", () => {
    const message = formatStaffWarningMessage({
      level: 1,
      targetId: USER,
      reason: "س",
      evidence: ["a", "b"],
    });
    expect(message.split("\n")).toHaveLength(4);
  });

  it("mentions the member rather than naming them", () => {
    const message = formatStaffWarningMessage({
      level: 1,
      targetId: USER,
      reason: "س",
      evidence: [],
    });
    expect(message).toContain(`<@${USER}>`);

    expect(message.split(`<@${USER}>`).join("")).not.toContain(USER);
  });

  it("preserves the reason verbatim, including special characters", () => {
    const reason = 'سبب فيه "اقتباس" و <@&999> و `كود` و \\ رموز 100%';
    const message = formatStaffWarningMessage({
      level: 1,
      targetId: USER,
      reason,
      evidence: [],
    });
    expect(message).toContain(`**السبب : ${reason}**`);
  });

  it("keeps every proof url when several exist", () => {
    const urls = [
      "https://cdn.discordapp.com/a.png",
      "https://cdn.discordapp.com/b.png",
      "https://cdn.discordapp.com/c.png",
    ];
    const message = formatStaffWarningMessage({
      level: 2,
      targetId: USER,
      reason: "س",
      evidence: urls,
    });
    expect(message).toContain(`**الدليل : ${urls.join(" ")}**`);
    for (const url of urls) expect(message).toContain(url);
  });

  it("falls back to لا يوجد for missing or blank proof", () => {
    for (const evidence of [[], ["   "], ["", "  "]]) {
      const message = formatStaffWarningMessage({
        level: 1,
        targetId: USER,
        reason: "س",
        evidence,
      });
      expect(message).toContain("**الدليل : لا يوجد**");
    }
  });

  it("trims the proof list rather than exceeding Discord's limit", () => {
    const many = Array.from({ length: 60 }, (_, i) => `https://cdn.discordapp.com/${i}-${"x".repeat(40)}.png`);
    const message = formatStaffWarningMessage({
      level: 3,
      targetId: USER,
      reason: "س".repeat(500),
      evidence: many,
    });

    expect(message.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
    expect(message.split("\n")).toHaveLength(4);
    expect(message).toContain("…");

    expect(message).toContain(many[0] as string);
  });
});

describe("Verbal Staff Warn channel message format", () => {
  it("uses the شفوي heading instead of a level", () => {
    const message = formatVerbalStaffWarningMessage({
      targetId: USER,
      reason: "تأخير عن الشفت",
      evidence: [],
    });

    expect(message).toBe(
      [
        `**Staff Warn شفوي ${ATTENTION}**`,
        `**منشن : <@${USER}>**`,
        "**السبب : تأخير عن الشفت**",
        "**الدليل : لا يوجد**",
      ].join("\n"),
    );
  });

  it("keeps proof urls the same way the real-warning format does", () => {
    const message = formatVerbalStaffWarningMessage({
      targetId: USER,
      reason: "تأخير",
      evidence: ["https://example.com/proof.png"],
    });
    expect(message).toContain("**الدليل : https://example.com/proof.png**");
  });
});
