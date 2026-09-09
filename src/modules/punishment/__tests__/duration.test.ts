import { describe, expect, it } from "bun:test";
import {
  TIMEOUT_MAX_MS,
  TIMEOUT_PRESETS,
  clampTimeout,
  formatDuration,
  parseDuration,
} from "../services/duration.service.ts";

describe("parseDuration", () => {
  it("treats bare digits as minutes", () => {
    expect(parseDuration("5")).toBe(5 * 60_000);
    expect(parseDuration("90")).toBe(90 * 60_000);
  });

  it("parses single unit tokens", () => {
    expect(parseDuration("5m")).toBe(5 * 60_000);
    expect(parseDuration("1h")).toBe(3_600_000);
    expect(parseDuration("2d")).toBe(2 * 86_400_000);
    expect(parseDuration("1w")).toBe(604_800_000);
    expect(parseDuration("30s")).toBe(30_000);
  });

  it("parses compound tokens and sums them", () => {
    expect(parseDuration("1h30m")).toBe(3_600_000 + 30 * 60_000);
    expect(parseDuration("1h 30m")).toBe(3_600_000 + 30 * 60_000);
    expect(parseDuration("1d2h")).toBe(86_400_000 + 2 * 3_600_000);
  });

  it("is case-insensitive and trims", () => {
    expect(parseDuration("  1H  ")).toBe(3_600_000);
  });

  it("rejects junk / empty / zero / stray characters", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("0")).toBeNull();
    expect(parseDuration("0m")).toBeNull();
    expect(parseDuration("5x")).toBeNull();
    expect(parseDuration("5m junk")).toBeNull();
    expect(parseDuration("5m3")).toBeNull();
  });
});

describe("clampTimeout", () => {
  it("caps at Discord's 28-day maximum", () => {
    expect(clampTimeout(999 * 86_400_000)).toBe(TIMEOUT_MAX_MS);
  });

  it("raises sub-minute values to one minute", () => {
    expect(clampTimeout(1)).toBe(60_000);
  });

  it("passes valid values through (floored)", () => {
    expect(clampTimeout(3_600_000.9)).toBe(3_600_000);
  });
});

describe("formatDuration", () => {
  it("formats to at most two units", () => {
    expect(formatDuration(93_600_000)).toBe("1d 2h");
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("TIMEOUT_PRESETS", () => {
  it("are all parseable and within the Discord limit", () => {
    expect(TIMEOUT_PRESETS.length).toBeGreaterThan(0);
    for (const preset of TIMEOUT_PRESETS) {
      expect(parseDuration(preset.value)).toBe(preset.ms);
      expect(preset.ms).toBeLessThanOrEqual(TIMEOUT_MAX_MS);
    }
  });
});
