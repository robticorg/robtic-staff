import { describe, expect, it } from "bun:test";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";
import { resolveSleepDuration } from "../services/ticket-sleep.service.ts";
import { buildSleepDm } from "../render/sleep-dm.ts";

const HOUR = 3_600_000;
const MIN = 60_000;

describe("resolveSleepDuration", () => {
  it("defaults to 6 hours when nothing is given", () => {
    expect(resolveSleepDuration(undefined)).toBe(6 * HOUR);
    expect(resolveSleepDuration(null)).toBe(limits.ticketSleepDefaultMs);
    expect(resolveSleepDuration("   ")).toBe(limits.ticketSleepDefaultMs);
  });

  it("parses the forms a manager actually types", () => {
    expect(resolveSleepDuration("6h")).toBe(6 * HOUR);
    expect(resolveSleepDuration("5m")).toBe(5 * MIN);
    expect(resolveSleepDuration("1d")).toBe(24 * HOUR);
    expect(resolveSleepDuration("1h30m")).toBe(HOUR + 30 * MIN);

    expect(resolveSleepDuration("90")).toBe(90 * MIN);
  });

  it("rejects nonsense instead of silently defaulting", () => {
    expect(() => resolveSleepDuration("soon")).toThrow(ValidationError);
    expect(() => resolveSleepDuration("6hours")).toThrow(ValidationError);
    expect(() => resolveSleepDuration("0")).toThrow(ValidationError);
  });

  it("enforces the configured window at both ends", () => {
    expect(() => resolveSleepDuration("30s")).toThrow(ValidationError);
    expect(() => resolveSleepDuration("30d")).toThrow(ValidationError);

    expect(resolveSleepDuration("1m")).toBe(limits.ticketSleepMinMs);
    expect(resolveSleepDuration("7d")).toBe(limits.ticketSleepMaxMs);
  });
});

describe("sleep DM", () => {
  const dm = buildSleepDm({ guildId: "g1", channelId: "c1", duration: "6 ساعات" });

  it("is a plain message with the exact two-line wording", () => {
    expect(dm.content).toBe(
      "سيتم اقفال التكت الخاص بك خلال 6 ساعات اذا لم ترد\nالرجاء الذهاب الى التكت و الرد حالا",
    );
    expect(dm.embeds ?? []).toHaveLength(0);
  });

  it("carries one link button straight into the ticket channel", () => {
    const row = dm.components?.[0] as unknown as {
      components: { data: Record<string, unknown> }[];
    };
    expect(row.components).toHaveLength(1);
    expect(row.components[0]!.data.url).toBe("https://discord.com/channels/g1/c1");
    expect(row.components[0]!.data.label).toBe(ticketMessages.sleep.dm.button);
  });
});
