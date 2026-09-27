import { staffApplicationConfig } from "../../../data/staff-application/config.ts";

export type ApplicantIdentityResult =
  | { ok: true; name: string; age: number; city: string }
  | { ok: false; problem: "SHAPE" | "AGE" };

const WHOLE_NUMBER = /^\d+$/;

function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function parseApplicantIdentity(raw: string): ApplicantIdentityResult {
  const parts = raw
    .split(/[\n,،]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 3) return { ok: false, problem: "SHAPE" };

  const [name, ageText, city] = parts as [string, string, string];
  const normalizedAge = toAsciiDigits(ageText);
  if (!WHOLE_NUMBER.test(normalizedAge)) return { ok: false, problem: "AGE" };

  const age = Number.parseInt(normalizedAge, 10);
  if (age < staffApplicationConfig.minimumAge || age > staffApplicationConfig.maximumAge) {
    return { ok: false, problem: "AGE" };
  }
  return { ok: true, name: name.slice(0, 100), age, city: city.slice(0, 100) };
}

export function parseWholeNumber(raw: string): number | null {
  const normalized = toAsciiDigits(raw.trim().replace(/[,،\s]/g, ""));
  if (!WHOLE_NUMBER.test(normalized)) return null;
  const value = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(value) ? value : null;
}
