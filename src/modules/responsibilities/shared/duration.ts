import { responsibilityLimits } from "../../../data/responsibilities/config.ts";
import { parseDuration } from "../../punishment/services/duration.service.ts";

const WITH_UNIT = /^(\d+\s*[wdhms]\s*)+$/i;

export function parseResponsibilityDuration(raw: string): number | null {
  const value = raw.trim();
  if (!WITH_UNIT.test(value)) return null;
  const ms = parseDuration(value);
  if (ms === null || ms <= 0 || ms > responsibilityLimits.maxDurationMs) return null;
  return ms;
}
