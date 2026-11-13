import { currentLang } from "../../shared/utils/lang-context.ts";

const MONTH_DAYS = 30;
const YEAR_DAYS = 365;

function countLabel(n: number, [one, two, few, many]: [string, string, string, string]): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

const en = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "3 days", "2 months", "1 year and 4 months", in the server's language. */
export function formatElapsedDays(days: number): string {
  const ar = currentLang() !== "en";
  const safe = Math.max(0, Math.floor(days));
  if (safe < MONTH_DAYS) {
    if (safe === 0) return ar ? "أقل من يوم" : "less than a day";
    return ar ? countLabel(safe, ["يوم", "يومين", "أيام", "يوم"]) : en(safe, "day");
  }
  const years = Math.floor(safe / YEAR_DAYS);
  const months = Math.floor((safe % YEAR_DAYS) / MONTH_DAYS);
  const monthText = ar ? countLabel(months, ["شهر", "شهرين", "أشهر", "شهر"]) : en(months, "month");
  if (years === 0) return monthText;
  const yearText = ar ? countLabel(years, ["سنة", "سنتين", "سنوات", "سنة"]) : en(years, "year");
  return months === 0 ? yearText : ar ? `${yearText} و ${monthText}` : `${yearText} and ${monthText}`;
}
