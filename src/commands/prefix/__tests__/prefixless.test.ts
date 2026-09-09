import { describe, expect, it } from "bun:test";
import { prefixCommandAliases } from "../../../data/commands/prefix-aliases.ts";
import { prefixlessCommands } from "../../../data/commands/prefixless.ts";
import { prefixCommands } from "../index.ts";
import { parseBareMessage, parsePrefixMessage } from "../_shared/parse.ts";

const canonical = new Set(prefixCommands.map((c) => c.name));

describe("prefixless commands", () => {
  it("every prefixless entry is a real command", () => {
    for (const name of prefixlessCommands) {
      expect(canonical.has(name)).toBe(true);
    }
  });

  it("builds the prefixless lookup the runner builds (canonical + english + arabic aliases)", () => {
    const map = new Map<string, string>();
    const byName = new Map(prefixCommands.map((c) => [c.name, c]));
    for (const name of prefixlessCommands) {
      const cmd = byName.get(name);
      if (!cmd) continue;
      map.set(cmd.name, cmd.name);
      for (const a of cmd.aliases ?? []) map.set(a, cmd.name);
      for (const a of prefixCommandAliases[name] ?? []) map.set(a, cmd.name);
    }
    expect(map.get("warn")).toBe("warn");
    expect(map.get("تحذير")).toBe("warn");
    expect(map.get("وارن")).toBe("warn");
    expect(map.has("close")).toBe(false);
  });
});

describe("parseBareMessage", () => {
  it("parses a bare command with no prefix", () => {
    expect(parseBareMessage("warn @user being toxic")).toEqual({
      commandName: "warn",
      args: ["@user", "being", "toxic"],
      rest: "@user being toxic",
    });
  });

  it("lowercases the command word and trims", () => {
    expect(parseBareMessage("  Warn   x  ")).toEqual({
      commandName: "warn",
      args: ["x"],
      rest: "x",
    });
  });

  it("returns null for empty input", () => {
    expect(parseBareMessage("   ")).toBeNull();
  });

  it("parsePrefixMessage still requires the prefix and reuses the bare parser", () => {
    expect(parsePrefixMessage("!warn x", "!")).toEqual({
      commandName: "warn",
      args: ["x"],
      rest: "x",
    });
    expect(parsePrefixMessage("warn x", "!")).toBeNull();
  });
});
