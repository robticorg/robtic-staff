import { describe, expect, it } from "bun:test";
import { classifyWarnChannel } from "../services/warn-channels.ts";

describe("classifyWarnChannel", () => {
  const cfg = { userWarnsChannelId: "user-ch", staffWarnsChannelId: "staff-ch" };

  it("routes by the configured channel id", () => {
    expect(classifyWarnChannel("user-ch", cfg)).toBe("USER");
    expect(classifyWarnChannel("staff-ch", cfg)).toBe("STAFF");
  });

  it("returns null anywhere else (command is silently ignored)", () => {
    expect(classifyWarnChannel("random", cfg)).toBeNull();
    expect(classifyWarnChannel("user-ch", { userWarnsChannelId: null, staffWarnsChannelId: null })).toBeNull();
  });
});
