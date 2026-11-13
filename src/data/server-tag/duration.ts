import { currentLang } from "../../shared/utils/lang-context.ts";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// Durations in the server's language. The names say "Arabic" from before the bot spoke English; they now follow the
// current language (shared/utils/lang-context.ts).

function countLabel(n: number, [one, two, few, many]: [string, string, string, string]): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

const en = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function formatArabicMinutes(n: number): string {
  return currentLang() === "en" ? en(n, "minute") : countLabel(n, ["دقيقة", "دقيقتين", "دقائق", "دقيقة"]);
}

export function formatArabicHours(n: number): string {
  return currentLang() === "en" ? en(n, "hour") : countLabel(n, ["ساعة", "ساعتين", "ساعات", "ساعة"]);
}

export function formatArabicDays(n: number): string {
  return currentLang() === "en" ? en(n, "day") : countLabel(n, ["يوم", "يومين", "أيام", "يوم"]);
}

export function formatArabicDuration(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  if (safe >= DAY_MS) return formatArabicDays(Math.round(safe / DAY_MS));
  if (safe >= HOUR_MS) return formatArabicHours(Math.round(safe / HOUR_MS));
  return formatArabicMinutes(Math.max(1, Math.round(safe / MINUTE_MS)));
}
