import { describe, expect, it } from "bun:test";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { prefixCommands } from "../../../commands/prefix/index.ts";
import {
  CommandLogOutcome,
  buildCommandLog,
  prefixLogSlot,
} from "../services/command-log.service.ts";

describe("command log routing", () => {
  it("sends each command family to its own room", () => {
    expect(prefixLogSlot("jail", "staff")).toBe(ChannelConfigType.JAIL_LOG);
    expect(prefixLogSlot("unjail", "staff")).toBe(ChannelConfigType.JAIL_LOG);
    expect(prefixLogSlot("accept", "staff")).toBe(ChannelConfigType.STAFF_LOG);
    expect(prefixLogSlot("warn", "staff")).toBe(ChannelConfigType.WARN_COMMAND_LOG);
    expect(prefixLogSlot("close", "ticket")).toBe(ChannelConfigType.TICKET_LOG);
    expect(prefixLogSlot("end", "modmail")).toBe(ChannelConfigType.TICKET_LOG);
  });

  it("falls back to the general command log", () => {
    expect(prefixLogSlot("stats", "staff")).toBe(ChannelConfigType.COMMAND_LOG);
  });

  it("gives every registered prefix command a log room", () => {
    for (const command of prefixCommands) {
      expect(prefixLogSlot(command.name, command.category)).toBeDefined();
    }
  });
});

describe("command log message", () => {
  it("renders command, actor, targets and reason", () => {
    const text = buildCommandLog({
      slot: ChannelConfigType.JAIL_LOG,
      invocation: "!jail <@2> spam",
      actorId: "1",
      channelId: "9",
      targetIds: ["2", "2"],
      outcome: CommandLogOutcome.DENIED,
      detail: "no proof",
      url: "https://discord.com/channels/a/b/c",
      at: new Date(0),
    });
    expect(text).toContain("!jail <@2> spam");
    expect(text).toContain("<@1>");
    expect(text).toContain("<#9>");
    expect(text.match(/<@2>/g)?.length).toBe(2); // once in the command, once as target
    expect(text).toContain("no proof");
    expect(text).toContain("https://discord.com/channels/a/b/c");
  });
});
