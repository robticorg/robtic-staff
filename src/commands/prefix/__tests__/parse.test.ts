import { describe, expect, it } from "bun:test";
import {
  extractRoleIds,
  extractUserIds,
  firstUserTarget,
  isSnowflake,
  parseCount,
  parsePrefixMessage,
} from "../_shared/parse.ts";
import { textAfterTarget } from "../_shared/warn-config.ts";

describe("parsePrefixMessage", () => {
  it("splits command + args, ignoring non-prefixed messages", () => {
    expect(parsePrefixMessage("hello there", "!")).toBeNull();
    expect(parsePrefixMessage("!", "!")).toBeNull();
    expect(parsePrefixMessage("!claim", "!")).toEqual({ commandName: "claim", args: [], rest: "" });
  });

  it("lowercases the command name and keeps the raw rest", () => {
    const p = parsePrefixMessage("!Accept <@1> 5", "!");
    expect(p?.commandName).toBe("accept");
    expect(p?.args).toEqual(["<@1>", "5"]);
    expect(p?.rest).toBe("<@1> 5");
  });

  it("supports a multi-character / custom prefix", () => {
    expect(parsePrefixMessage(">>ping now", ">>")).toEqual({
      commandName: "ping",
      args: ["now"],
      rest: "now",
    });
  });
});

describe("mention / id extraction", () => {
  const args = ["<@123456789012345678>", "222222222222222222", "<@&333333333333333333>", "junk"];

  it("extractUserIds picks user mentions + raw snowflakes but not role mentions", () => {
    expect(extractUserIds(args)).toEqual(["123456789012345678", "222222222222222222"]);
  });
  it("extractRoleIds picks only role mentions", () => {
    expect(extractRoleIds(args)).toEqual(["333333333333333333"]);
  });
  it("firstUserTarget: a user mention wins; otherwise the first raw snowflake", () => {
    expect(firstUserTarget(["<@&9>", "444444444444444444", "<@555555555555555555>"])).toBe(
      "555555555555555555",
    );
    expect(firstUserTarget(["<@&9>", "444444444444444444"])).toBe("444444444444444444");
    expect(firstUserTarget(["text", "<@666666666666666666>"])).toBe("666666666666666666");
    expect(firstUserTarget(["nothing"])).toBeNull();
  });
});

describe("parseCount", () => {
  it("parses non-negative integers only", () => {
    expect(parseCount("0")).toBe(0);
    expect(parseCount("7")).toBe(7);
    expect(parseCount("-1")).toBeNull();
    expect(parseCount("abc")).toBeNull();
    expect(parseCount(undefined)).toBeNull();
  });
});

describe("isSnowflake", () => {
  it("accepts 17-20 digits", () => {
    expect(isSnowflake("12345678901234567")).toBe(true);
    expect(isSnowflake("123")).toBe(false);
  });
});

describe("textAfterTarget", () => {
  it("strips a leading user mention or raw id, keeping the reason", () => {
    expect(textAfterTarget("<@!111111111111111111> being toxic in general")).toBe(
      "being toxic in general",
    );
    expect(textAfterTarget("222222222222222222 spamming")).toBe("spamming");
    expect(textAfterTarget("no target here")).toBe("no target here");
  });
});
