const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Arabic counts are not "N + plural". 1 and 2 take their own forms, 3–10 take
 * the broken plural (جمع قلّة), and 11+ go back to the singular.
 */
function countLabel(n: number, [one, two, few, many]: [string, string, string, string]): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function formatArabicMinutes(n: number): string {
  return countLabel(n, ["دقيقة", "دقيقتين", "دقائق", "دقيقة"]);
}

export function formatArabicHours(n: number): string {
  return countLabel(n, ["ساعة", "ساعتين", "ساعات", "ساعة"]);
}

export function formatArabicDays(n: number): string {
  return countLabel(n, ["يوم", "يومين", "أيام", "يوم"]);
}

/**
 * Human duration in natural Arabic — used for the restriction window, which is
 * 3 days by default but configurable.
 */
export function formatArabicDuration(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  if (safe >= DAY_MS) return formatArabicDays(Math.round(safe / DAY_MS));
  if (safe >= HOUR_MS) return formatArabicHours(Math.round(safe / HOUR_MS));
  return formatArabicMinutes(Math.max(1, Math.round(safe / MINUTE_MS)));
}
