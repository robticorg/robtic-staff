import { describe, expect, it } from "bun:test";
import { FAST_ACCESS_CONTEXT_VALUES, FastAccessContext } from "../../configuration/types/enums.ts";
import { fastAccessArgs, fillFastAccessArgs, isFastAccessAllowedIn } from "../fast-access-runner.ts";

describe("public fast-access macros", () => {
  it("is a valid context", () => {
    expect(FAST_ACCESS_CONTEXT_VALUES).toContain(FastAccessContext.PUBLIC);
  });

  it("works in any channel, including tickets and modmail", () => {
    expect(isFastAccessAllowedIn(FastAccessContext.PUBLIC, null)).toBe(true);
    expect(isFastAccessAllowedIn(FastAccessContext.PUBLIC, FastAccessContext.SUPPORT)).toBe(true);
    expect(isFastAccessAllowedIn(FastAccessContext.PUBLIC, FastAccessContext.MODMAIL)).toBe(true);
  });

  it("keeps other macros in their own place", () => {
    expect(isFastAccessAllowedIn(FastAccessContext.SUPPORT, null)).toBe(false);
    expect(isFastAccessAllowedIn(FastAccessContext.SUPPORT, FastAccessContext.MODMAIL)).toBe(false);
    expect(isFastAccessAllowedIn(FastAccessContext.SUPPORT, FastAccessContext.SUPPORT)).toBe(true);
  });
});

describe("fast-access [args]", () => {
  it("reads everything typed after the command", () => {
    expect(fastAccessArgs("$hi Ahmed  the  great ", "$", "hi")).toBe("Ahmed  the  great");
    expect(fastAccessArgs("$ hi", "$", "hi")).toBe("");
  });

  it("fills every [args] in the message, any case", () => {
    expect(fillFastAccessArgs("Welcome [args]! [ARGS]", "Ahmed")).toBe("Welcome Ahmed! Ahmed");
    expect(fillFastAccessArgs("Rules: [args]", "")).toBe("Rules:");
    expect(fillFastAccessArgs("no placeholder", "x")).toBe("no placeholder");
  });

  it("keeps $ patterns in the args literal and caps the length", () => {
    expect(fillFastAccessArgs("[args]", "$& $1")).toBe("$& $1");
    expect(fillFastAccessArgs("[args]", "a".repeat(3000))).toHaveLength(2000);
  });
});
