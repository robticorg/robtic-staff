
const SEC = 1_000;
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

const UNIT_MS: Record<"s" | "m" | "h" | "d" | "w", number> = {
  s: SEC,
  m: MIN,
  h: HOUR,
  d: DAY,
  w: WEEK,
};

export const TIMEOUT_MAX_MS = 28 * DAY;
export const TIMEOUT_MIN_MS = MIN;

export interface DurationPreset {
  label: string;
  value: string;
  ms: number;
}

export const TIMEOUT_PRESETS: readonly DurationPreset[] = (
  [
    ["5m", 5 * MIN],
    ["10m", 10 * MIN],
    ["30m", 30 * MIN],
    ["1h", 1 * HOUR],
    ["6h", 6 * HOUR],
    ["12h", 12 * HOUR],
    ["1d", 1 * DAY],
    ["3d", 3 * DAY],
    ["7d", 7 * DAY],
  ] as const
).map(([value, ms]) => ({ label: value, value, ms }));

export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const minutes = Number(trimmed);
    return minutes > 0 ? minutes * MIN : null;
  }

  const re = /(\d+)\s*(w|d|h|m|s)\s*/g;
  let total = 0;
  let matched = false;
  let cursor = 0;
  for (let m = re.exec(trimmed); m; m = re.exec(trimmed)) {
    if (m.index !== cursor) return null;
    cursor = re.lastIndex;
    matched = true;
    const unit = m[2] as "s" | "m" | "h" | "d" | "w";
    total += Number(m[1]) * UNIT_MS[unit];
  }
  if (!matched || cursor !== trimmed.length || total <= 0) return null;
  return total;
}

export function clampTimeout(ms: number): number {
  return Math.min(TIMEOUT_MAX_MS, Math.max(TIMEOUT_MIN_MS, Math.floor(ms)));
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const parts: string[] = [];
  let remaining = Math.floor(ms / 1000);
  for (const [unit, seconds] of [
    ["d", 86_400],
    ["h", 3_600],
    ["m", 60],
    ["s", 1],
  ] as const) {
    const n = Math.floor(remaining / seconds);
    if (n > 0) {
      parts.push(`${n}${unit}`);
      remaining -= n * seconds;
    }
  }
  return parts.slice(0, 2).join(" ") || "0s";
}

export const durationService = {
  parse: parseDuration,
  clampTimeout,
  format: formatDuration,
  presets: TIMEOUT_PRESETS,
  maxMs: TIMEOUT_MAX_MS,
};
