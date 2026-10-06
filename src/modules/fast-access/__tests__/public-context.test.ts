import { describe, expect, it } from "bun:test";
import { FAST_ACCESS_CONTEXT_VALUES, FastAccessContext } from "../../configuration/types/enums.ts";
import { isFastAccessAllowedIn } from "../fast-access-runner.ts";

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
