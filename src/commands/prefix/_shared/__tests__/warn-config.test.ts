import { describe, expect, it } from "bun:test";
import { splitVerbalMarker } from "../warn-config.ts";

describe("splitVerbalMarker", () => {
  it("treats a trailing standalone '=' as the verbal marker", () => {
    expect(splitVerbalMarker("تأخير عن العمل =")).toEqual({
      reason: "تأخير عن العمل",
      isVerbal: true,
    });
  });

  it("treats a reason with no trailing '=' as direct/real", () => {
    expect(splitVerbalMarker("تأخير عن العمل")).toEqual({
      reason: "تأخير عن العمل",
      isVerbal: false,
    });
  });

  it("does not treat '=' glued onto a word as the marker", () => {
    expect(splitVerbalMarker("سبب=غريب")).toEqual({
      reason: "سبب=غريب",
      isVerbal: false,
    });
  });

  it("collapses to an empty reason when only '=' was typed", () => {
    expect(splitVerbalMarker("=")).toEqual({ reason: "", isVerbal: true });
  });

  it("trims surrounding whitespace", () => {
    expect(splitVerbalMarker("  سبب واضح  =  ")).toEqual({
      reason: "سبب واضح",
      isVerbal: true,
    });
  });
});
